import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'
import type { ReactNode } from 'react'

const config = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif'],
      },
    },
  },
}

export function Layout({
  title,
  preview,
  children,
}: {
  title: string
  preview: string
  children: ReactNode
}) {
  return (
    <Html lang="en">
      <Head>
        <title>{title}</title>
      </Head>
      <Preview>{preview}</Preview>
      <Tailwind config={config}>
        <Body className="m-0 bg-zinc-100 py-[40px] font-sans text-zinc-900">
          <Container className="mx-auto max-w-[560px] px-[16px]">
            <Section className="pb-[24px] text-center">
              <Text className="m-0 text-[28px] font-bold leading-[36px] tracking-tight text-brand-700">
                Matcha
              </Text>
            </Section>

            <Section className="rounded-[12px] bg-white px-[40px] py-[40px]">
              {children}
            </Section>

            <Section className="px-[16px] pt-[24px] text-center">
              <Text className="m-0 text-[12px] leading-[20px] text-zinc-500">
                You received this email because of activity on your Matcha
                account. This is an automated message, please do not reply.
              </Text>
              <Text className="m-0 pt-[8px] text-[12px] leading-[20px] text-zinc-400">
                © {new Date().getFullYear()} Matcha
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
