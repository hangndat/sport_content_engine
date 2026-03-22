import { useState } from 'react';
import { Card, Select, Skeleton, Row, Col, Typography } from 'antd';
import { RiseOutlined } from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
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
  if (series.length === 0) return null;

  const chartData = dates.map((date) => {
    const point: Record<string, string | number> = { date: formatDate(date) };
    for (const s of series) {
      point[s.name] = s.data.find((d) => d.date === date)?.count ?? 0;
    }
    return point;
  });

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
      <Card size="small" title={title}>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [v, 'Bài viết']} labelFormatter={(l) => `Ngày ${l}`} />
              <Legend />
              {series.map((s, i) => (
                <Line
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
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

  return (
    <Card
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RiseOutlined />
          Biến động trend theo ngày
        </span>
      }
      extra={
        <Row gutter={8} wrap={false}>
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
          <Select
            value={type}
            onChange={setType}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'teams', label: 'Đội bóng' },
              { value: 'competitions', label: 'Giải đấu' },
              { value: 'players', label: 'Cầu thủ' },
            ]}
            style={{ width: 120 }}
          />
        </Row>
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
