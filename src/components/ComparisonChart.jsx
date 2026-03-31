import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const ComparisonChart = ({ dataHistory }) => {
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#94a3b8',
          font: { weight: 'bold', size: 12 },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        }
      },
      title: {
        display: true,
        text: '⚡ So sánh độ trễ giữa các giao thức (ms)',
        color: '#e2e8f0',
        font: { size: 16, weight: 'bold' },
        padding: { bottom: 20 }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        borderColor: 'rgba(139, 92, 246, 0.3)',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        cornerRadius: 12,
        padding: 12,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Thời gian (ms)',
          color: '#64748b',
          font: { weight: 'bold' }
        },
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: '#475569' }
      },
      x: {
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: '#475569' }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };

  const data = {
    labels: Array.from({ length: Math.max(dataHistory.rest.length, dataHistory.graphql.length, dataHistory.grpc.length, 10) }, (_, i) => i + 1),
    datasets: [
      {
        label: 'REST',
        data: dataHistory.rest,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
      {
        label: 'GraphQL',
        data: dataHistory.graphql,
        borderColor: '#ec4899',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
      {
        label: 'gRPC',
        data: dataHistory.grpc,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="bg-[#111827]/80 backdrop-blur-sm p-6 rounded-2xl border border-white/5 mb-8">
      <Line options={options} data={data} />
    </div>
  );
};

export default ComparisonChart;