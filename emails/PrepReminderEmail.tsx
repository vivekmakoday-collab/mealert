import {
  Html, Head, Body, Container, Section, Text, Heading, Hr,
} from '@react-email/components'
import type { Family } from '@/types'
import type { PrepItem } from '@/lib/prep'

interface Props {
  family: Family
  date: string   // the date the prep is FOR (tomorrow)
  items: PrepItem[]
}

export default function PrepReminderEmail({ family, date, items }: Props) {
  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f3f4f6', fontFamily: 'Arial, sans-serif', margin: 0, padding: '24px 0' }}>
        <Container style={{ maxWidth: 520, margin: '0 auto', backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden' }}>
          <Section style={{ background: '#7c3a12', padding: '28px 32px 22px' }}>
            <Heading style={{ color: '#ffffff', margin: 0, fontSize: 24, fontWeight: 700 }}>
              🌙 Prep ahead for tomorrow
            </Heading>
            <Text style={{ color: '#f0d6c0', margin: '6px 0 0', fontSize: 13 }}>
              {family.name}
            </Text>
            <Text style={{ color: '#ffe9d6', margin: '2px 0 0', fontSize: 14 }}>
              For {dateLabel}
            </Text>
          </Section>

          <Section style={{ padding: '24px 32px 8px' }}>
            <Text style={{ margin: '0 0 12px', fontSize: 14, color: '#374151' }}>
              A few things need prepping tonight so tomorrow&apos;s meals are ready:
            </Text>
            {items.map((item, i) => (
              <Section key={i} style={{ marginBottom: 14 }}>
                <Text style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {item.slotLabel} · {item.mealName}
                </Text>
                <Text style={{ margin: '3px 0 0', fontSize: 16, color: '#111827' }}>
                  ✅ {item.note}
                </Text>
                {i < items.length - 1 && <Hr style={{ borderColor: '#f3f4f6', margin: '14px 0 0' }} />}
              </Section>
            ))}
          </Section>

          <Section style={{ padding: '8px 32px 28px' }}>
            <Text style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              Sent by MealAlert · your evening prep reminder
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
