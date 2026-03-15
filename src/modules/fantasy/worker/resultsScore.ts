// Called by pg-boss worker on Fly.io as 'fantasy.results.score'
// Input: { eventId: string }

import { pool } from '@/lib/db/client'
import { getBasePoints, getBonusPoints, computeTeamTotal } from '../lib/scoring'
import { MANUFACTURER_POSITION_POINTS } from '../constants/scoring'
import { grantXP } from '@/modules/xp/lib/engine'

export async function handleResultsScore(payload: { eventId: string }) {
  const { eventId } = payload
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1. Load event + series
    const eventRes = await client.query(
      `SELECT e.id, e."seriesId", s."salaryCap", s.discipline, s.season
       FROM fantasy_events e JOIN fantasy_series s ON s.id = e."seriesId"
       WHERE e.id = $1`,
      [eventId]
    )
    if (eventRes.rows.length === 0) throw new Error(`Event ${eventId} not found`)
    const { seriesId, salaryCap, discipline, season } = eventRes.rows[0]

    // 2. Copy confirmed RaceResult data into RiderEventEntry
    await client.query(`
      UPDATE rider_event_entries ree
      SET
        "finishPosition" = rr."finishPosition",
        "qualifyingPosition" = rr."qualifyingPosition",
        "dnsDnf" = rr."dnsDnf",
        "partialCompletion" = rr."partialCompletion"
      FROM race_results rr
      WHERE rr."eventId" = $1
        AND rr."riderId" = ree."riderId"
        AND ree."eventId" = $1
        AND rr.status = 'confirmed'
    `, [eventId])

    // 3. Compute per-rider fantasy points
    const riderEntries = await client.query(
      `SELECT ree.id, ree."riderId", ree."finishPosition", ree."qualifyingPosition",
              ree."dnsDnf", ree."partialCompletion", r.nationality
       FROM rider_event_entries ree
       JOIN riders r ON r.id = ree."riderId"
       WHERE ree."eventId" = $1`,
      [eventId]
    )

    // Find fastest qualifier
    const entriesWithQual = riderEntries.rows.filter((r: { qualifyingPosition: number | null }) => r.qualifyingPosition !== null)
    const fastestQualId = entriesWithQual.sort(
      (a: { qualifyingPosition: number }, b: { qualifyingPosition: number }) => a.qualifyingPosition - b.qualifyingPosition
    )[0]?.riderId

    // Get event country for home-country podium
    const eventCountryRes = await client.query(`SELECT country FROM fantasy_events WHERE id = $1`, [eventId])
    const eventCountry = eventCountryRes.rows[0]?.country

    // Get EWS stage wins
    const stageResultsMap: Record<string, number> = {}
    if (discipline === 'ews') {
      const stageRes = await client.query(
        `SELECT "riderId", "stageResults" FROM race_results WHERE "eventId" = $1 AND "stageResults" IS NOT NULL`,
        [eventId]
      )
      for (const row of stageRes.rows) {
        const stages = row.stageResults as Array<{ position: number }>
        stageResultsMap[row.riderId] = stages.filter(s => s.position === 1).length
      }
    }

    for (const entry of riderEntries.rows) {
      const basePoints = getBasePoints({
        finishPosition: entry.finishPosition,
        dnsDnf: entry.dnsDnf,
        partialCompletion: entry.partialCompletion,
      })

      const homePodium =
        entry.nationality === eventCountry &&
        entry.finishPosition !== null &&
        entry.finishPosition <= 3

      const bonusPoints = getBonusPoints({
        isFastestQualifier: entry.riderId === fastestQualId && discipline !== 'ews',
        stageWins: stageResultsMap[entry.riderId] ?? 0,
        homePodium,
      })

      await client.query(
        `UPDATE rider_event_entries SET "fantasyPoints" = $1, "bonusPoints" = $2 WHERE id = $3`,
        [basePoints, bonusPoints, entry.id]
      )
    }

    // 4. Compute per-team totals
    const teams = await client.query(
      `SELECT ft.id as "teamId", ft."userId",
              COALESCE(SUM(fp."priceAtPick"), 0) as "totalCost"
       FROM fantasy_teams ft
       LEFT JOIN fantasy_picks fp ON fp."teamId" = ft.id AND fp."eventId" = $1
       WHERE ft."seriesId" = $2 AND ft.season = $3
       GROUP BY ft.id, ft."userId"`,
      [eventId, seriesId, season]
    )

    const allScores: { teamId: string; totalPoints: number }[] = []

    for (const team of teams.rows) {
      const picksRes = await client.query(
        `SELECT fp."isWildcard", fp."priceAtPick",
                ree."finishPosition", ree."dnsDnf", ree."fantasyPoints", ree."bonusPoints"
         FROM fantasy_picks fp
         JOIN rider_event_entries ree ON ree."eventId" = $1 AND ree."riderId" = fp."riderId"
         WHERE fp."teamId" = $2 AND fp."eventId" = $1`,
        [eventId, team.teamId]
      )

      const picksWithScores = picksRes.rows.map((p: {
        isWildcard: boolean; priceAtPick: number; finishPosition: number | null;
        dnsDnf: boolean; fantasyPoints: number | null; bonusPoints: number | null;
      }) => ({
        isWildcard: p.isWildcard,
        finishPosition: p.finishPosition,
        dnsDnf: p.dnsDnf,
        basePoints: p.fantasyPoints ?? 0,
        bonusPoints: p.bonusPoints ?? 0,
      }))

      const result = computeTeamTotal({
        picks: picksWithScores,
        salaryCap,
        totalCost: Number(team.totalCost),
      })

      // Upsert FantasyEventScore
      await client.query(
        `INSERT INTO fantasy_event_scores (id, "teamId", "eventId", "basePoints", "bonusPoints", "totalPoints", "isOverBudget")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
         ON CONFLICT ("teamId", "eventId") DO UPDATE SET
           "basePoints" = EXCLUDED."basePoints",
           "bonusPoints" = EXCLUDED."bonusPoints",
           "totalPoints" = EXCLUDED."totalPoints",
           "isOverBudget" = EXCLUDED."isOverBudget"`,
        [team.teamId, eventId, result.basePoints, result.bonusPoints + result.wildcardBonus + result.perfectRoundBonus, result.totalPoints, result.isOverBudget]
      )

      allScores.push({ teamId: team.teamId, totalPoints: result.totalPoints })
    }

    // 5. Assign event ranks
    allScores.sort((a, b) => b.totalPoints - a.totalPoints)
    for (let i = 0; i < allScores.length; i++) {
      await client.query(
        `UPDATE fantasy_event_scores SET rank = $1 WHERE "teamId" = $2 AND "eventId" = $3`,
        [i + 1, allScores[i].teamId, eventId]
      )
    }

    // 6. Update FantasySeasonScore totals
    await client.query(`
      INSERT INTO fantasy_season_scores (id, "teamId", "seriesId", season, "totalPoints", "eventsPlayed", "bestEventScore", "worstEventScore")
      SELECT
        gen_random_uuid(),
        fes."teamId",
        $1,
        $2,
        COALESCE(SUM(fes."totalPoints") FILTER (WHERE NOT fes."isDropRound"), 0),
        COUNT(fes.id),
        MAX(fes."totalPoints"),
        MIN(fes."totalPoints")
      FROM fantasy_event_scores fes
      JOIN fantasy_teams ft ON ft.id = fes."teamId"
      WHERE ft."seriesId" = $1 AND ft.season = $2
      GROUP BY fes."teamId"
      ON CONFLICT ("teamId") DO UPDATE SET
        "totalPoints" = EXCLUDED."totalPoints",
        "eventsPlayed" = EXCLUDED."eventsPlayed",
        "bestEventScore" = EXCLUDED."bestEventScore",
        "worstEventScore" = EXCLUDED."worstEventScore"
    `, [seriesId, season])

    // Step: Drop round — mark worst event as isDropRound for season pass holders
    // Only applied when the team has 2+ scored events (no point dropping a single result)
    const passHolderTeamsRes = await client.query(
      `SELECT DISTINCT ft.id AS "teamId"
       FROM fantasy_teams ft
       JOIN season_pass_purchases spp
         ON spp."userId" = ft."userId"
         AND spp."seriesId" = ft."seriesId"
         AND spp.season = ft.season
         AND spp.status = 'active'
       WHERE ft."seriesId" = $1 AND ft.season = $2`,
      [seriesId, season]
    )

    for (const row of passHolderTeamsRes.rows) {
      const teamId: string = row.teamId

      // Count scored events for this team
      const countRes = await client.query(
        `SELECT COUNT(*) AS count FROM fantasy_event_scores WHERE "teamId" = $1`,
        [teamId]
      )
      if (parseInt(countRes.rows[0].count) < 2) continue

      // Find the worst event
      const worstRes = await client.query(
        `SELECT id FROM fantasy_event_scores
         WHERE "teamId" = $1
         ORDER BY "totalPoints" ASC
         LIMIT 1`,
        [teamId]
      )
      if (worstRes.rows.length === 0) continue
      const worstId: string = worstRes.rows[0].id

      // Clear all existing drop round flags for this team
      await client.query(
        `UPDATE fantasy_event_scores SET "isDropRound" = false WHERE "teamId" = $1`,
        [teamId]
      )

      // Mark new worst as drop round
      await client.query(
        `UPDATE fantasy_event_scores SET "isDropRound" = true WHERE id = $1`,
        [worstId]
      )
    }

    // Recompute season totals now that isDropRound flags are updated
    // (re-run the same UPSERT — the FILTER (WHERE NOT isDropRound) picks up the new flags)
    if (passHolderTeamsRes.rows.length > 0) {
      await client.query(`
        INSERT INTO fantasy_season_scores (id, "teamId", "seriesId", season, "totalPoints", "eventsPlayed", "bestEventScore", "worstEventScore")
        SELECT
          gen_random_uuid(),
          fes."teamId",
          $1,
          $2,
          COALESCE(SUM(fes."totalPoints") FILTER (WHERE NOT fes."isDropRound"), 0),
          COUNT(fes.id),
          MAX(fes."totalPoints"),
          MIN(fes."totalPoints")
        FROM fantasy_event_scores fes
        JOIN fantasy_teams ft ON ft.id = fes."teamId"
        JOIN season_pass_purchases spp
          ON spp."userId" = ft."userId"
          AND spp."seriesId" = ft."seriesId"
          AND spp.season = ft.season
          AND spp.status = 'active'
        WHERE ft."seriesId" = $1 AND ft.season = $2
        GROUP BY fes."teamId"
        ON CONFLICT ("teamId") DO UPDATE SET
          "totalPoints" = EXCLUDED."totalPoints",
          "eventsPlayed" = EXCLUDED."eventsPlayed",
          "bestEventScore" = EXCLUDED."bestEventScore",
          "worstEventScore" = EXCLUDED."worstEventScore"
      `, [seriesId, season])
    }

    // 7. Assign season ranks
    const seasonScores = await client.query(
      `SELECT id, "totalPoints" FROM fantasy_season_scores
       WHERE "seriesId" = $1 AND season = $2
       ORDER BY "totalPoints" DESC`,
      [seriesId, season]
    )
    for (let i = 0; i < seasonScores.rows.length; i++) {
      await client.query(
        `UPDATE fantasy_season_scores SET rank = $1 WHERE id = $2`,
        [i + 1, seasonScores.rows[i].id]
      )
    }

    // 7.5 — Manufacturer Cup scoring pass
    // For each active ManufacturerPick for this series+season, find the top-finishing
    // brand rider for this event, compute half-table points, upsert ManufacturerEventScore,
    // and add manufacturerPoints to the user's FantasyEventScore.

    const mfrPicks = await client.query(
      `SELECT mp.id AS "manufacturerPickId", mp."userId", mp."manufacturerId"
       FROM manufacturer_picks mp
       WHERE mp."seriesId" = $1 AND mp.season = $2
         AND mp."lockedAt" IS NOT NULL`,
      [seriesId, season]
    )

    // Load all rider event entries with manufacturer info for this event
    const mfrRiderEntries = await client.query(
      `SELECT ree."riderId", ree."finishPosition", ree."dnsDnf", ree."partialCompletion",
              r."manufacturerId"
       FROM rider_event_entries ree
       JOIN riders r ON r.id = ree."riderId"
       WHERE ree."eventId" = $1`,
      [eventId]
    )

    for (const pick of mfrPicks.rows) {
      const { manufacturerPickId, userId, manufacturerId } = pick

      // Find top finisher for this brand
      const eligible = mfrRiderEntries.rows.filter(
        (e: { manufacturerId: string | null; dnsDnf: boolean; partialCompletion: boolean; finishPosition: number | null }) =>
          e.manufacturerId === manufacturerId &&
          !e.dnsDnf &&
          !e.partialCompletion &&
          e.finishPosition !== null
      ).sort((a: { finishPosition: number }, b: { finishPosition: number }) => a.finishPosition - b.finishPosition)

      if (eligible.length === 0) {
        // No eligible riders this event — skip (0-pt placeholder not needed)
        continue
      }

      const topRider = eligible[0] as { riderId: string; finishPosition: number }
      const mfrPoints = MANUFACTURER_POSITION_POINTS[topRider.finishPosition] ?? 0

      // Upsert ManufacturerEventScore
      await client.query(
        `INSERT INTO manufacturer_event_scores
           (id, "userId", "seriesId", season, "eventId", "manufacturerPickId", points, "riderId", "riderFinishPosition")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT ("userId", "seriesId", season, "eventId") DO UPDATE SET
           points = EXCLUDED.points,
           "riderId" = EXCLUDED."riderId",
           "riderFinishPosition" = EXCLUDED."riderFinishPosition",
           "manufacturerPickId" = EXCLUDED."manufacturerPickId"`,
        [userId, seriesId, season, eventId, manufacturerPickId, mfrPoints, topRider.riderId, topRider.finishPosition]
      )

      if (mfrPoints === 0) continue

      // Add manufacturer points to the user's FantasyEventScore for this event
      await client.query(
        `UPDATE fantasy_event_scores fes
         SET
           "manufacturerPoints" = $1,
           "totalPoints" = "totalPoints" - "manufacturerPoints" + $1
         FROM fantasy_teams ft
         WHERE ft.id = fes."teamId"
           AND ft."userId" = $2
           AND fes."eventId" = $3`,
        [mfrPoints, userId, eventId]
      )
    }

    // 8. Grant XP to all participants
    const top10PctCutoff = Math.ceil(allScores.length * 0.1)
    for (let i = 0; i < allScores.length; i++) {
      const teamScoreInfo = allScores[i]
      const teamUserRes = await client.query(
        `SELECT "userId" FROM fantasy_teams WHERE id = $1`,
        [teamScoreInfo.teamId]
      )
      const userId = teamUserRes.rows[0]?.userId
      if (!userId) continue

      try {
        await grantXP({ userId, event: 'fantasy_team_scored', module: 'fantasy', refId: `${eventId}:${teamScoreInfo.teamId}` })
        if (i < top10PctCutoff && teamScoreInfo.totalPoints > 0) {
          await grantXP({ userId, event: 'fantasy_top_10_pct', module: 'fantasy', refId: `top10:${eventId}:${teamScoreInfo.teamId}` })
        }
      } catch {
        // XP already granted (unique constraint) — idempotent
      }
    }

    // 9. Mark event as scored
    await client.query(
      `UPDATE fantasy_events SET status = 'scored' WHERE id = $1`,
      [eventId]
    )

    console.log(`[fantasy.results.score] Scored event ${eventId}: ${allScores.length} teams`)

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}
