import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, Select, Skeleton, Typography } from 'antd';
import { ReadOutlined } from '@ant-design/icons';
import { useQuery } from '../hooks/useQuery';
import { getArticlesByDay } from '../api';

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

export default function ArticlesByDayChart() {
  const [days, setDays] = useState(7);
  const { data, loading } = useQuery(() => getArticlesByDay({ days }), [days]);

  const items = data?.data ?? [];
  const chartData = items.map((r) => ({
    date: formatDate(r.date),
    count: r.count,
  }));

  const option = useMemo(
    () => ({
      grid: { top: 20, right: 20, bottom: 30, left: 45, containLabel: true },
      xAxis: { type: 'category' as const, data: chartData.map((d) => d.date), axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value' as const, axisLabel: { fontSize: 11 }, splitNumber: 5 },
      tooltip: {
        trigger: 'axis' as const,
        formatter: (params: { name: string; value: unknown }[]) =>
          params?.length ? `Ngày ${params[0].name}<br/>Bài: ${params[0].value}` : '',
      },
      series: [
        {
          type: 'line' as const,
          data: chartData.map((d) => d.count),
          smooth: false,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2, color: '#13c2c2' },
          itemStyle: { color: '#13c2c2' },
        },
      ],
    }),
    [chartData]
  );

  const chartIconStyle = {
    width: 36,
    height: 36,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    backgroundColor: '#e6fffb',
    color: '#13c2c2',
  };

  if (loading) {
    return (
      <Card size="small" styles={{ header: { padding: '16px 20px' }, body: { padding: 20 } }}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  return (
    <Card
      size="small"
      styles={{
        header: { padding: '16px 20px' },
        body: { padding: 20 },
      }}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={chartIconStyle}>
            <ReadOutlined />
          </span>
          Bài theo ngày đăng
        </span>
      }
      extra={
        <Select
          value={days}
          onChange={setDays}
          options={[
            { value: 7, label: '7 ngày' },
            { value: 14, label: '14 ngày' },
            { value: 30, label: '30 ngày' },
          ]}
          style={{ width: 100 }}
        />
      }
    >
      {chartData.length === 0 ? (
        <Typography.Text type="secondary">Chưa có dữ liệu trong khoảng thời gian đã chọn.</Typography.Text>
      ) : (
        <div style={{ width: '100%', minHeight: 220 }}>
          <ReactECharts option={option} style={{ height: 220 }} opts={{ renderer: 'canvas' }} notMerge />
        </div>
      )}
    </Card>
  );
}
