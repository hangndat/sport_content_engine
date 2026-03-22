import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, Select, Skeleton, Row, Col, Space, Typography } from 'antd';
import { RiseOutlined } from '@ant-design/icons';
import { useQuery } from '../hooks/useQuery';
import { getTrendsDaily, type TrendDailyResponse } from '../api';

const COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1'];

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

function ChartPanel({
  title,
  series,
  dates,
  loading,
}: {
  title: string;
  series: { name: string; data: { date: string; count: number }[] }[];
  dates: string[];
  loading?: boolean;
}) {
  const xData = useMemo(() => dates.map((d) => formatDate(d)), [dates]);
  const option = useMemo(
    () => ({
      grid: { top: 20, right: 20, bottom: 45, left: 45, containLabel: true },
      xAxis: { type: 'category' as const, data: xData, axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value' as const, axisLabel: { fontSize: 11 }, splitNumber: 5 },
      tooltip: { trigger: 'axis' as const },
      legend: { bottom: 5, left: 'center', textStyle: { fontSize: 11 }, itemGap: 16 },
      series: series.map((s, i) => ({
        name: s.name,
        type: 'line' as const,
        data: dates.map((d) => s.data.find((x) => x.date === d)?.count ?? 0),
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: COLORS[i % COLORS.length] },
        itemStyle: { color: COLORS[i % COLORS.length] },
      })),
    }),
    [series, dates, xData]
  );

  if (series.length === 0) return null;

  if (loading) {
    return (
      <Col xs={24} lg={12}>
        <Card>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      </Col>
    );
  }

  return (
    <Col xs={24} lg={12}>
      <Card size="small" styles={{ header: { padding: '16px 20px' }, body: { padding: 16 } }} title={title}>
        <div style={{ width: '100%', minHeight: 240 }}>
          <ReactECharts option={option} style={{ height: 240 }} opts={{ renderer: 'canvas' }} notMerge />
        </div>
      </Card>
    </Col>
  );
}

export default function TrendDailyChart() {
  const [days, setDays] = useState(7);
  const [type, setType] = useState<'teams' | 'players' | 'competitions' | 'all'>('all');
  const { data, loading } = useQuery(
    () => getTrendsDaily({ days, limit: 5, type: type === 'all' ? undefined : type }),
    [days, type]
  );

  const resp = data as TrendDailyResponse | undefined;

  const chartIconStyle = {
    width: 36,
    height: 36,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    backgroundColor: '#e6f4ff',
    color: '#1677ff',
  };

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
            <RiseOutlined />
          </span>
          Biến động trend theo ngày
        </span>
      }
      extra={
        <Space wrap size={8}>
          <Select
            value={days}
            onChange={setDays}
            options={[
              { value: 7, label: '7 ngày' },
              { value: 14, label: '14 ngày' },
              { value: 30, label: '30 ngày' },
            ]}
            style={{ minWidth: 90 }}
          />
          <Select
            value={type}
            onChange={setType}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'teams', label: 'Đội bóng' },
              { value: 'competitions', label: 'Giải đấu' },
              { value: 'players', label: 'Cầu thủ' },
            ]}
            style={{ minWidth: 110 }}
          />
        </Space>
      }
    >
      {!resp?.dates?.length && !loading && (
        <Typography.Text type="secondary">Chưa có dữ liệu trong khoảng thời gian đã chọn.</Typography.Text>
      )}
      {(resp?.dates?.length ?? 0) > 0 && resp && (
        <Row gutter={[16, 16]}>
          {(type === 'all' || type === 'teams') && (resp.teams?.length ?? 0) > 0 && (
            <ChartPanel
              title="Đội bóng"
              series={resp.teams ?? []}
              dates={resp.dates}
              loading={loading}
            />
          )}
          {(type === 'all' || type === 'competitions') && (resp.competitions?.length ?? 0) > 0 && (
            <ChartPanel
              title="Giải đấu"
              series={resp.competitions ?? []}
              dates={resp.dates}
              loading={loading}
            />
          )}
          {(type === 'all' || type === 'players') && (resp.players?.length ?? 0) > 0 && (
            <ChartPanel
              title="Cầu thủ"
              series={resp.players ?? []}
              dates={resp.dates}
              loading={loading}
            />
          )}
        </Row>
      )}
    </Card>
  );
}
