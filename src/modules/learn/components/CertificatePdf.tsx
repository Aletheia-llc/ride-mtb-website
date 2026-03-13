import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const TIER_COLORS: Record<string, string> = {
  gold: '#D97706',
  silver: '#6B7280',
  bronze: '#92400E',
  incomplete: '#6B7280',
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 60,
    fontFamily: 'Helvetica',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  border: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    border: '3pt solid #22c55e',
  },
  brand: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#22c55e',
    marginBottom: 4,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: '#22c55e',
    marginBottom: 24,
    alignSelf: 'center',
  },
  heading: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  userName: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#22c55e',
    marginBottom: 16,
    textAlign: 'center',
  },
  completionText: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  courseTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 24,
    textAlign: 'center',
  },
  tierRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 16,
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  score: {
    fontSize: 11,
    color: '#6B7280',
  },
  dateText: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  certId: {
    fontSize: 7,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
  },
})

interface CertificatePdfProps {
  courseTitle: string
  tier: string
  issuedAt: Date | string
  userName: string
  score: number
  certId: string
}

export function CertificatePdf({
  courseTitle,
  tier,
  issuedAt,
  userName,
  score,
  certId,
}: CertificatePdfProps) {
  const date = typeof issuedAt === 'string' ? new Date(issuedAt) : issuedAt
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const tierColor = TIER_COLORS[tier.toLowerCase()] ?? '#6B7280'
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1)

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.border} />

        <Text style={styles.brand}>Ride MTB</Text>
        <Text style={styles.tagline}>Mountain Biking Learning Platform</Text>

        <View style={styles.divider} />

        <Text style={styles.heading}>Certificate of Completion</Text>
        <Text style={styles.subtitle}>This certifies that</Text>

        <Text style={styles.userName}>{userName}</Text>

        <Text style={styles.completionText}>has successfully completed</Text>
        <Text style={styles.courseTitle}>{courseTitle}</Text>

        <View style={styles.tierRow}>
          <Text
            style={[
              styles.tierBadge,
              { backgroundColor: tierColor },
            ]}
          >
            {tierLabel}
          </Text>
          <Text style={styles.score}>Score: {score}%</Text>
        </View>

        <Text style={styles.dateText}>Issued on {formattedDate}</Text>

        <Text style={styles.certId}>Certificate ID: {certId}</Text>
      </Page>
    </Document>
  )
}
