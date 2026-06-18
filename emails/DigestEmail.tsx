import {
  Html, Head, Body, Container, Section, Text, Heading, Hr, Link, Row, Column,
} from '@react-email/components'
import type { DigestMealSlot, Family } from '@/types'

interface Props {
  family: Family
  date: string
  slots: DigestMealSlot[]
  appUrl: string
}

const slotEmoji: Record<string, string> = {
  '🌅 Breakfast': '🌅',
  '☀️ Lunch': '☀️',
  '🍎 Snack': '🍎',
  '🌙 Dinner': '🌙',
}

export default function DigestEmail({ family, date, slots, appUrl }: Props) {
  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f3f4f6', fontFamily: 'Arial, sans-serif', margin: 0, padding: '24px 0' }}>
        <Container style={{ maxWidth: 520, margin: '0 auto', backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden' }}>
          {/* Header */}
          <Section style={{ background: '#1a3a5c', padding: '32px 32px 24px' }}>
            <Heading style={{ color: '#ffffff', margin: 0, fontSize: 26, fontWeight: 700 }}>
              Good morning! 🍽
            </Heading>
            <Text style={{ color: '#a8c8e8', margin: '6px 0 0', fontSize: 13 }}>
              {family.name} · Meal Digest
            </Text>
            <Text style={{ color: '#d0e8ff', margin: '4px 0 0', fontSize: 14 }}>
              {dateLabel}
            </Text>
          </Section>

          {/* Meal slots */}
          <Section style={{ padding: '24px 32px 8px' }}>
            {slots.map(({ label, meal }) => (
              <Section key={label} style={{ marginBottom: 20 }}>
                <Row>
                  <Column>
                    <Text style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>
                      {label}
                    </Text>
                    {meal ? (
                      <>
                        <Text style={{ margin: '4px 0 2px', fontSize: 17, fontWeight: 600, color: '#111827' }}>
                          {meal.name}
                        </Text>
                        {meal.description && (
                          <Text style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>
                            {meal.description}
                          </Text>
                        )}
                        <Text style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
                          {meal.calories} kcal · {meal.protein_g}g protein · {meal.carbs_g}g carbs · {meal.fat_g}g fat
                        </Text>
                      </>
                    ) : (
                      <Text style={{ margin: '4px 0', fontSize: 14, color: '#9ca3af', fontStyle: 'italic' }}>
                        Nothing planned
                      </Text>
                    )}
                  </Column>
                </Row>
                <Hr style={{ borderColor: '#f3f4f6', margin: '16px 0 0' }} />
              </Section>
            ))}
          </Section>

          {/* Footer */}
          <Section style={{ padding: '8px 32px 28px' }}>
            <Text style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              Sent by MealAlert ·{' '}
              <Link href={`${appUrl}/settings`} style={{ color: '#6b7280' }}>Manage preferences</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
