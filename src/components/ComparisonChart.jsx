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
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const ComparisonChart = ({ dataHistory }) => {
  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Độ trễ các giao thức (ms)' },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Thời gian (ms)' } }
    },
  };

  const data = {
    labels: Array.from({ length: dataHistory.rest.length || 10 }, (_, i) => i + 1),
    datasets: [
      {
        label: 'REST',
        data: dataHistory.rest,
        borderColor: '#2563eb', // Blue
        backgroundColor: 'rgba(37, 99, 235, 0.5)',
        tension: 0.3,
      },
      {
        label: 'GraphQL',
        data: dataHistory.graphql,
        borderColor: '#db2777', // Pink
        backgroundColor: 'rgba(219, 39, 119, 0.5)',
        tension: 0.3,
      },
      {
        label: 'gRPC',
        data: dataHistory.grpc,
        borderColor: '#059669', // Emerald
        backgroundColor: 'rgba(5, 150, 105, 0.5)',
        tension: 0.3,
      },
    ],
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-100 mb-8">
      <Line options={options} data={data} />
    </div>
  );
};

export default ComparisonChart;