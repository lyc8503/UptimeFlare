import { useState } from 'react';
import { Container, Group, Text } from '@mantine/core';
import classes from '@/styles/Header.module.css';

const links = [
  { link: '/about', label: 'Features' },
  { link: '/pricing', label: 'Pricing' },
  { link: '/learn', label: 'Learn' },
  { link: '/community', label: 'Community' },
];

export default function Header() {
  const [active, setActive] = useState(links[0].link);

  const items = links.map((link) => (
    <a
      key={link.label}
      href={link.link}
      className={classes.link}
      data-active={active === link.link || undefined}
      onClick={(event) => {
        event.preventDefault();
        setActive(link.link);
      }}
    >
      {link.label}
    </a>
  ));

  return (
    <header className={classes.header}>
      <Container size="md" className={classes.inner}>
        <div>
          <a href='https://github.com/lyc8503/UptimeFlare' target='_blank'>
            <Text size='xl' span>🕒</Text>
            <Text size='xl' span fw={700} variant="gradient" gradient={{ from: 'blue', to: 'cyan', deg: 90 }}>UptimeFlare</Text>
          </a>
        </div>
        <Group gap={5}>
          {items}
        </Group>
      </Container>
    </header>
  );
}