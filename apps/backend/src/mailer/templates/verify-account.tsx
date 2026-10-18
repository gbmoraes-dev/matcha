import {
  Button,
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from '@react-email/components'
import { Layout } from './layout'

export default function VerifyAccount({
  name,
  url,
}: {
  name: string
  url: string
}) {
  return (
    <Layout
      title="Verify your account"
      preview="Confirm your email to start meeting people on Matcha"
    >
      <Heading className="m-0 text-[24px] font-bold leading-[32px] text-zinc-900">
        Confirm your email
      </Heading>

      <Text className="mb-0 mt-[16px] text-[16px] leading-[26px] text-zinc-600">
        Hi {name}, welcome to Matcha! Confirm your email address to finish
        creating your account and start meeting people.
      </Text>

      <Section className="mt-[28px] text-center">
        <Button
          href={url}
          className="rounded-[8px] bg-brand-600 px-[28px] py-[14px] text-[16px] font-semibold leading-[24px] text-white no-underline"
        >
          Verify my account
        </Button>
      </Section>

      <Hr className="my-[32px] border-zinc-200" />

      <Text className="m-0 text-[13px] leading-[22px] text-zinc-500">
        If the button does not work, copy and paste this link into your browser:
      </Text>
      <Link
        href={url}
        className="break-all text-[13px] leading-[22px] text-brand-700"
      >
        {url}
      </Link>

      <Text className="mb-0 mt-[24px] text-[13px] leading-[22px] text-zinc-500">
        If you did not create a Matcha account, you can safely ignore this
        email.
      </Text>
    </Layout>
  )
}

VerifyAccount.PreviewProps = {
  name: 'Ana',
  url: 'https://matcha.test/verify?token=abc123',
}
