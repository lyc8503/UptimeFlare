import Head from 'next/head'
import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Container,
  Group,
  Loader,
  MultiSelect,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconCalendarPlus,
  IconCloud,
  IconLock,
  IconLogout,
  IconPlayerPlay,
  IconRefresh,
  IconTool,
} from '@tabler/icons-react'
import {
  maintenanceDurations,
  maintenanceStatus,
  monitorInMaintenance,
  type MaintenanceEvent,
} from '@/util/maintenance'
import classes from '@/styles/Admin.module.css'
import adminConfig from '@/deploy/admin.json'

type Monitor = { id: string; name: string }
type DashboardData = { events: MaintenanceEvent[]; monitors: Monitor[]; user?: { email: string } }

class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
  }
}

async function adminRequest<T = unknown>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    redirect: 'manual',
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  })
  if (
    response.type === 'opaqueredirect' ||
    !response.headers.get('content-type')?.includes('application/json')
  ) {
    throw new ApiError('Sign in with Cloudflare Access to continue.', 401)
  }
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok)
    throw new ApiError(data.error || 'Something went wrong. Please try again.', response.status)
  return data
}

function dateLabel(date: number) {
  return new Date(date).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function localDateValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export default function Admin() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [data, setData] = useState<DashboardData>({ events: [], monitors: [] })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState('')
  const mutationPending = useRef(false)
  const refreshVersion = useRef(0)
  const [now, setNow] = useState(Date.now())
  const [quickDuration, setQuickDuration] = useState('30')
  const [quickMonitorId, setQuickMonitorId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [monitorIds, setMonitorIds] = useState<string[]>([])
  const [schedule, setSchedule] = useState('now')
  const [start, setStart] = useState(() => localDateValue(new Date(Date.now() + 60 * 60_000)))
  const [duration, setDuration] = useState<string | null>('30')
  const [end, setEnd] = useState(() => localDateValue(new Date(Date.now() + 90 * 60_000)))
  const [color, setColor] = useState<string | null>('blue')
  const [tab, setTab] = useState('current')

  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current
    try {
      const result = await adminRequest<DashboardData>('events')
      if (version !== refreshVersion.current) return
      setData(result)
      setAuthenticated(true)
      setNow(Date.now())
    } catch (err) {
      if (version !== refreshVersion.current) return
      if (err instanceof ApiError && err.status === 401) {
        setAuthenticated(false)
        setData({ events: [], monitors: [] })
      } else {
        setError(err instanceof Error ? err.message : 'Unable to load the dashboard.')
        setAuthenticated((value) => (value === null ? false : value))
      }
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])
  useEffect(() => {
    if (!authenticated) return
    const update = () => {
      if (document.visibilityState === 'visible' && !mutationPending.current) void refresh()
    }
    const interval = setInterval(update, 30_000)
    const clock = setInterval(() => setNow(Date.now()), 1000)
    window.addEventListener('focus', update)
    return () => {
      clearInterval(interval)
      clearInterval(clock)
      window.removeEventListener('focus', update)
    }
  }, [authenticated, refresh])

  async function run(action: string, task: () => Promise<void>) {
    if (mutationPending.current) return
    mutationPending.current = true
    // Ignore any older background read that finishes after this mutation.
    refreshVersion.current++
    setBusy(action)
    setError('')
    setSuccess('')
    try {
      await task()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      if (err instanceof ApiError && err.status === 401) {
        setAuthenticated(false)
        setData({ events: [], monitors: [] })
      }
    } finally {
      mutationPending.current = false
      setBusy('')
    }
  }

  async function saveEvent(input: unknown, method = 'POST') {
    const { event } = await adminRequest<{ event: MaintenanceEvent }>('events', method, input)
    setData((current) => ({
      ...current,
      events: [event, ...current.events.filter((item) => item.id !== event.id)],
    }))
    setNow(Date.now())
    setSuccess(
      method === 'POST'
        ? 'Event published. The status page will update automatically.'
        : 'Event updated. The status page will update automatically.'
    )
    await refresh()
  }

  function createEvent(event: FormEvent) {
    event.preventDefault()
    void run('create', async () => {
      const startTime = schedule === 'now' ? Date.now() : new Date(start).getTime()
      await saveEvent({
        title,
        body,
        monitors: monitorIds,
        color,
        start: schedule === 'now' ? 'now' : startTime,
        end:
          duration === '0'
            ? null
            : duration === 'custom'
            ? new Date(end).getTime()
            : startTime + Number(duration) * 60_000,
      })
      setTitle('')
      setBody('')
      setTab('current')
    })
  }

  const active = data.events.filter((event) => maintenanceStatus(event, now) === 'Active')
  const upcoming = data.events.filter((event) => maintenanceStatus(event, now) === 'Upcoming')
  const quickMonitor = data.monitors.find(({ id }) => id === quickMonitorId) ?? data.monitors[0]
  const quickActive = !!quickMonitor && monitorInMaintenance(active, quickMonitor.id, now)
  const visibleEvents = data.events
    .filter((event) => {
      const status = maintenanceStatus(event, now)
      return tab === 'current'
        ? status === 'Active' || status === 'Upcoming'
        : status === 'Completed' || status === 'Cancelled'
    })
    .sort((a, b) => (tab === 'current' ? a.start - b.start : b.start - a.start))

  const messages = (
    <>
      {error && (
        <Alert
          color="red"
          title="Couldn’t complete that"
          role="alert"
          withCloseButton
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert color="teal" role="status" withCloseButton onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
    </>
  )

  return (
    <div className={classes.page}>
      <Head>
        <title>Maintenance admin · Status page</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <Container size="lg" py="xl">
        <Group justify="space-between" mb={40}>
          <Link href="/" className={classes.back}>
            <IconArrowLeft size={16} /> Status page
          </Link>
          <Group gap="xs">
            <span className={classes.indicator} />
            <Text size="xs" fw={700} c="dimmed">
              ADMIN CONSOLE
            </Text>
          </Group>
        </Group>

        {authenticated === null ? (
          <Stack align="center" py={100}>
            <Loader />
            <Text c="dimmed">Opening your dashboard…</Text>
          </Stack>
        ) : !authenticated ? (
          <Paper className={classes.login} p={{ base: 'lg', sm: 36 }} radius="lg" withBorder>
            <div className={classes.icon}>
              <IconLock size={28} />
            </div>
            <Title order={1} size="h2" mt="lg">
              Maintenance administration
            </Title>
            <Text c="dimmed" mt="xs" mb="xl">
              Use Cloudflare Access to publish events and manage maintenance windows.
            </Text>
            <Stack gap="md">
              {messages}
              <Button component="a" href={`${adminConfig.adminOrigin}/admin`} fullWidth size="md">
                Continue with Cloudflare Access
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Stack gap="xl">
            <Group justify="space-between" align="flex-end">
              <div>
                <Text className={classes.eyebrow}>STATUS PAGE OPERATIONS</Text>
                <Title order={1} className={classes.title}>
                  Maintenance desk
                </Title>
                <Text c="dimmed" mt="xs">
                  Publish notices and manage maintenance windows.
                </Text>
              </div>
              <Group gap="sm">
                <Text size="xs" c="dimmed">
                  {data.user?.email}
                </Text>
                <Button
                  component="a"
                  href={`${adminConfig.adminOrigin}/cdn-cgi/access/logout`}
                  variant="subtle"
                  color="gray"
                  leftSection={<IconLogout size={16} />}
                  disabled={!!busy}
                >
                  Sign out
                </Button>
              </Group>
            </Group>

            {messages}

            <div className={classes.stats}>
              {[
                { label: 'Active now', value: active.length, note: 'Maintenance in progress' },
                { label: 'Coming up', value: upcoming.length, note: 'Scheduled and ready' },
                {
                  label: 'Monitored services',
                  value: data.monitors.length,
                  note: 'Available for events',
                },
              ].map((stat) => (
                <Paper key={stat.label} p="lg" radius="md" withBorder>
                  <Text size="sm" c="dimmed">
                    {stat.label}
                  </Text>
                  <Text className={classes.statNumber}>
                    {stat.value.toString().padStart(2, '0')}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {stat.note}
                  </Text>
                </Paper>
              ))}
            </div>

            <div className={classes.columns}>
              <Stack gap="xl">
                <Paper className={classes.quick} p={{ base: 'lg', sm: 'xl' }} radius="lg">
                  <Group justify="space-between" mb="lg">
                    <div className={classes.cloudIcon}>
                      <IconCloud size={30} />
                    </div>
                    <Badge variant="light" color={quickActive ? 'teal' : 'blue'}>
                      {quickActive ? 'In maintenance' : 'QUICK ACTION'}
                    </Badge>
                  </Group>
                  <Title order={2} size="h3">
                    Quick maintenance
                  </Title>
                  <Text mt="xs" c="dimmed" size="sm">
                    Choose a service, publish a notice, and pause its downtime notifications.
                  </Text>
                  <Select
                    label="Service"
                    mt="lg"
                    data={data.monitors.map(({ id, name }) => ({ value: id, label: name }))}
                    value={quickMonitor?.id ?? null}
                    onChange={setQuickMonitorId}
                    allowDeselect={false}
                    searchable
                    disabled={!!busy}
                  />
                  <Select
                    label="Maintenance window"
                    mt="lg"
                    data={maintenanceDurations}
                    value={quickDuration}
                    onChange={(value) => setQuickDuration(value || '30')}
                    allowDeselect={false}
                    disabled={!!busy || quickActive}
                  />
                  <Button
                    fullWidth
                    size="md"
                    mt="md"
                    leftSection={<IconPlayerPlay size={17} />}
                    loading={busy === 'quick'}
                    disabled={!!busy || quickActive || !quickMonitor}
                    onClick={() =>
                      void run('quick', async () => {
                        if (!quickMonitor) return
                        await saveEvent({
                          preset: 'maintenance',
                          monitorId: quickMonitor.id,
                          minutes: Number(quickDuration),
                        })
                        setTab('current')
                      })
                    }
                  >
                    {quickActive ? 'Service is in maintenance' : 'Start maintenance now'}
                  </Button>
                  <Text size="xs" c="dimmed" mt="sm">
                    {quickActive
                      ? 'Manage the active event below to extend or end it.'
                      : 'Starts immediately. You can end it early at any time.'}
                  </Text>
                </Paper>

                <section aria-label="Maintenance events">
                  <Group justify="space-between" mb="md">
                    <Title order={2} size="h3">
                      Your events
                    </Title>
                    <Button
                      variant="subtle"
                      size="xs"
                      leftSection={<IconRefresh size={14} />}
                      disabled={!!busy}
                      onClick={() => void run('refresh', refresh)}
                    >
                      Refresh
                    </Button>
                  </Group>
                  <SegmentedControl
                    mb="lg"
                    value={tab}
                    onChange={setTab}
                    data={[
                      { value: 'current', label: 'Active & upcoming' },
                      { value: 'history', label: 'History' },
                    ]}
                  />
                  <Stack gap="md">
                    {visibleEvents.length === 0 ? (
                      <Paper withBorder radius="md" p="xl" className={classes.empty}>
                        <IconCalendarPlus size={28} stroke={1.5} />
                        <Text fw={600} mt="sm">
                          {tab === 'current' ? 'Nothing on the calendar' : 'No past events yet'}
                        </Text>
                        <Text c="dimmed" size="sm" mt={4}>
                          {tab === 'current'
                            ? 'Start a quick window or schedule your next event.'
                            : 'Completed and cancelled events will appear here.'}
                        </Text>
                      </Paper>
                    ) : (
                      visibleEvents.map((event) => {
                        const status = maintenanceStatus(event, now)
                        return (
                          <Paper
                            key={event.id}
                            withBorder
                            p="lg"
                            radius="md"
                            className={classes.event}
                          >
                            <Group justify="space-between" mb="sm">
                              <Badge
                                color={
                                  status === 'Active'
                                    ? 'teal'
                                    : status === 'Upcoming'
                                    ? 'blue'
                                    : 'gray'
                                }
                                variant="light"
                              >
                                {status}
                              </Badge>
                              <Text size="xs" c="dimmed">
                                {event.source === 'config'
                                  ? 'From configuration'
                                  : 'Dashboard event'}
                              </Text>
                            </Group>
                            <Title order={3} size="h4">
                              {event.title}
                            </Title>
                            <Text
                              size="sm"
                              c="dimmed"
                              mt="xs"
                              style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}
                            >
                              {event.body}
                            </Text>
                            <Group gap={6} mt="md">
                              {(event.monitors?.length
                                ? event.monitors
                                : data.monitors.map((monitor) => monitor.id)
                              ).map((id) => (
                                <Badge key={id} variant="outline" color="gray" size="sm">
                                  {data.monitors.find((monitor) => monitor.id === id)?.name || id}
                                </Badge>
                              ))}
                            </Group>
                            <Text size="xs" c="dimmed" mt="md">
                              {dateLabel(event.start)} →{' '}
                              {event.end === undefined
                                ? 'Until further notice'
                                : dateLabel(event.end)}
                            </Text>
                            {event.source === 'dashboard' &&
                              (status === 'Active' || status === 'Upcoming') && (
                                <Group mt="md" gap="xs">
                                  {status === 'Active' && event.end !== undefined && (
                                    <Button
                                      size="xs"
                                      variant="light"
                                      disabled={!!busy}
                                      loading={busy === `${event.id}-extend`}
                                      onClick={() =>
                                        void run(`${event.id}-extend`, () =>
                                          saveEvent(
                                            { id: event.id, action: 'extend', minutes: 30 },
                                            'PATCH'
                                          )
                                        )
                                      }
                                    >
                                      +30 minutes
                                    </Button>
                                  )}
                                  <Button
                                    size="xs"
                                    variant="light"
                                    color={status === 'Active' ? 'teal' : 'gray'}
                                    disabled={!!busy}
                                    loading={busy === `${event.id}-end`}
                                    onClick={() =>
                                      void run(`${event.id}-end`, () =>
                                        saveEvent(
                                          {
                                            id: event.id,
                                            action: status === 'Active' ? 'end' : 'cancel',
                                          },
                                          'PATCH'
                                        )
                                      )
                                    }
                                  >
                                    {status === 'Active' ? 'End maintenance' : 'Cancel event'}
                                  </Button>
                                </Group>
                              )}
                          </Paper>
                        )
                      })
                    )}
                  </Stack>
                </section>
              </Stack>

              <Paper
                component="section"
                withBorder
                radius="lg"
                p={{ base: 'lg', sm: 'xl' }}
                className={classes.form}
              >
                <Group gap="sm" mb="xs">
                  <IconTool size={21} />
                  <Title order={2} size="h3">
                    Create an event
                  </Title>
                </Group>
                <Text size="sm" c="dimmed" mb="lg">
                  Tell people what’s happening and when.
                </Text>
                <form onSubmit={createEvent}>
                  <Stack gap="md">
                    <Select
                      label="Quick-fill template"
                      placeholder="Choose a starting point"
                      data={['Service update', 'Database maintenance', 'Network maintenance']}
                      clearable
                      onChange={(template) => {
                        if (!template) return
                        setTitle(template)
                        setBody(
                          template === 'Service update'
                            ? 'We are updating this service. You may experience brief interruptions during this window.'
                            : template === 'Database maintenance'
                            ? 'We are performing database maintenance. Affected services may be temporarily unavailable.'
                            : 'We are performing network maintenance. Connections to affected services may be interrupted.'
                        )
                      }}
                    />
                    <TextInput
                      label="Event title"
                      placeholder="e.g. Database upgrade"
                      required
                      maxLength={120}
                      value={title}
                      onChange={(event) => setTitle(event.currentTarget.value)}
                    />
                    <Textarea
                      label="Public notice"
                      placeholder="What should your users know?"
                      required
                      minRows={3}
                      maxLength={2000}
                      value={body}
                      onChange={(event) => setBody(event.currentTarget.value)}
                    />
                    <div>
                      <MultiSelect
                        label="Affected services"
                        placeholder="Choose services"
                        required
                        searchable
                        data={data.monitors.map((monitor) => ({
                          value: monitor.id,
                          label: monitor.name,
                        }))}
                        value={monitorIds}
                        onChange={setMonitorIds}
                      />
                      <Button
                        variant="transparent"
                        size="compact-xs"
                        mt="xs"
                        onClick={() => setMonitorIds(data.monitors.map((monitor) => monitor.id))}
                      >
                        Select all services
                      </Button>
                    </div>
                    <div>
                      <Text size="sm" fw={500} mb={6}>
                        Start time
                      </Text>
                      <SegmentedControl
                        fullWidth
                        value={schedule}
                        onChange={setSchedule}
                        data={[
                          { value: 'now', label: 'Start now' },
                          { value: 'later', label: 'Schedule' },
                        ]}
                      />
                    </div>
                    {schedule === 'later' && (
                      <TextInput
                        label="Scheduled start"
                        type="datetime-local"
                        required
                        value={start}
                        onChange={(event) => setStart(event.currentTarget.value)}
                      />
                    )}
                    <Select
                      label="Duration"
                      data={[
                        ...maintenanceDurations,
                        { value: 'custom', label: 'Custom end time' },
                      ]}
                      value={duration}
                      onChange={setDuration}
                      allowDeselect={false}
                      required
                    />
                    {duration === 'custom' && (
                      <TextInput
                        label="End time"
                        type="datetime-local"
                        required
                        value={end}
                        onChange={(event) => setEnd(event.currentTarget.value)}
                      />
                    )}
                    <Text size="xs" c="dimmed">
                      Times use your timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}.
                    </Text>
                    <Select
                      label="Notice color"
                      value={color}
                      onChange={setColor}
                      allowDeselect={false}
                      data={[
                        { value: 'blue', label: 'Blue · Maintenance' },
                        { value: 'yellow', label: 'Yellow · Advisory' },
                        { value: 'orange', label: 'Orange · Disruption' },
                        { value: 'red', label: 'Red · Urgent' },
                        { value: 'grape', label: 'Purple · Update' },
                        { value: 'gray', label: 'Gray · General' },
                      ]}
                    />
                    <Button
                      type="submit"
                      size="md"
                      mt="sm"
                      leftSection={<IconCalendarPlus size={18} />}
                      loading={busy === 'create'}
                      disabled={!!busy || !monitorIds.length}
                    >
                      {schedule === 'now' ? 'Publish event now' : 'Schedule event'}
                    </Button>
                    <Text size="xs" c="dimmed">
                      Events appear on your status page. Downtime notifications for affected
                      services pause during the window.
                    </Text>
                  </Stack>
                </form>
              </Paper>
            </div>
            <Text size="xs" c="dimmed" ta="center" pb="lg">
              Uptime checks and incident recording continue during maintenance.
            </Text>
          </Stack>
        )}
      </Container>
    </div>
  )
}

export function getStaticProps() {
  return adminConfig.enabled ? { props: {} } : { notFound: true }
}
