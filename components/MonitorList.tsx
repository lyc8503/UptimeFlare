import { MonitorState, MonitorTarget } from "@/uptime.types";
import { Card, Center, Divider, Text } from "@mantine/core";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);


export const options = {
  responsive: true,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: true,
      text: 'Response times',
      align: 'start' as const
    },
  },
};

const labels = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];

export const data = {
  labels,
  datasets: [
    {
      data: labels.map(() => Math.round(Math.random() * 1000)),
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.5)',
    }
  ],
};


export default function MonitorList({ config, state }: { config: any, state: MonitorState }) {

  return (
    <Center>
      <Card shadow="sm" padding="lg" radius="md" ml="xl" mr="xl" mt="xl" withBorder style={{ width: '800px' }}>
        {config.monitors.map((monitor: MonitorTarget) => (
          <div key={monitor.id}>
            <Card.Section>
              <Text>{monitor.name}</Text>
              <Line options={options} data={data} />
            </Card.Section>
            <Divider />
          </div>
        ))}
      </Card>
    </Center>
    );
}

