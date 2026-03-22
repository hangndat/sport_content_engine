import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ProLayout, PageContainer, ProConfigProvider, viVNIntl } from '@ant-design/pro-components';
import { App as AntdApp, Button, ConfigProvider, Tag } from 'antd';
import viVN from 'antd/locale/vi_VN';
import {
  ThunderboltOutlined,
  DashboardOutlined,
  ClusterOutlined,
  FileTextOutlined,
  LinkOutlined,
  SendOutlined,
  ReadOutlined,
  SyncOutlined,
  AppstoreOutlined,
  TagOutlined,
  HistoryOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import Articles from './pages/Articles';
import Clusters from './pages/Clusters';
import ClusterDetail from './pages/ClusterDetail';
import DraftCreator from './pages/DraftCreator';
import Crawl from './pages/Crawl';
import Drafts from './pages/Drafts';
import DraftDetail from './pages/DraftDetail';
import Sources from './pages/Sources';
import Posts from './pages/Posts';
import Dashboard from './pages/Dashboard';
import ClusterCategories from './pages/ClusterCategories';
import Topics from './pages/Topics';
import WriterHistory from './pages/WriterHistory';
import Settings from './pages/Settings';
import { triggerIngest, getConfig } from './api';
import { useQuery } from './hooks/useQuery';
import { MODE_LABELS } from './constants';

/** Menu theo pipeline: Thu thập → Gom tin → Biên tập → Xuất bản */
const route = {
  path: '/',
  routes: [
    { path: '/', name: 'Tổng quan', icon: <DashboardOutlined /> },
    {
      path: '/ingest',
      name: 'Thu thập',
      icon: <SyncOutlined />,
      routes: [
        { path: '/sources', name: 'Nguồn tin', icon: <LinkOutlined /> },
        { path: '/crawl', name: 'Lịch sử crawl', icon: <SyncOutlined /> },
        { path: '/articles', name: 'Bài viết', icon: <ReadOutlined /> },
      ],
    },
    {
      path: '/gom-tin',
      name: 'Gom tin',
      icon: <ClusterOutlined />,
      routes: [
        { path: '/clusters', name: 'Tin gom', icon: <ClusterOutlined /> },
        { path: '/cluster-categories', name: 'Nhóm chủ đề', icon: <AppstoreOutlined /> },
        { path: '/topics', name: 'Chủ đề & Quy tắc', icon: <TagOutlined /> },
      ],
    },
    { path: '/drafts', name: 'Bản nháp', icon: <FileTextOutlined /> },
    { path: '/writer-history', name: 'Lịch sử viết', icon: <HistoryOutlined /> },
    { path: '/posts', name: 'Bài đã đăng', icon: <SendOutlined /> },
    { path: '/settings', name: 'Cài đặt GPT', icon: <SettingOutlined /> },
  ],
};

function LayoutContent() {
  const location = useLocation();
  const { message } = AntdApp.useApp();
  const [ingesting, setIngesting] = useState(false);
  const { data: config } = useQuery(getConfig);
  const mode = (config as { moderationMode?: string })?.moderationMode ?? 'A';

  const handleIngest = async () => {
    setIngesting(true);
    try {
      const data = await triggerIngest();
      if (data.ok) {
        message.success(`${data.articlesFetched} articles, ${data.clustersCreated} clusters`);
      } else {
        message.error(data.error || 'Ingest failed');
      }
    } catch {
      message.error('Ingest failed');
    } finally {
      setIngesting(false);
    }
  };

  return (
    <ProLayout
      title="Sport Content Engine"
      logo={<span style={{ fontSize: 24 }}>⚽</span>}
      layout="mix"
      fixedHeader
      fixSiderbar
      location={{ pathname: location.pathname }}
      route={route}
      menuItemRender={(item, dom) => {
        if (item.path && !item.isUrl) {
          return <Link to={item.path}>{dom}</Link>;
        }
        return dom;
      }}
      subMenuItemRender={(_, dom) => dom}
      avatarProps={{
        src: null,
        title: 'Admin',
      }}
      actionsRender={() => [
        <Tag key="mode" color={mode === 'A' ? 'orange' : mode === 'B' ? 'blue' : 'green'}>
          {MODE_LABELS[mode] ?? mode}
        </Tag>,
        <Button
          key="ingest"
          type="primary"
          icon={<ThunderboltOutlined />}
          loading={ingesting}
          onClick={handleIngest}
        >
          Crawl ngay
        </Button>,
      ]}
      menu={{ collapsedShowTitle: true }}
    >
      <PageContainer fixHeader pageHeaderRender={false}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crawl" element={<Crawl />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/clusters" element={<Clusters />} />
          <Route path="/clusters/:clusterId/create-draft" element={<DraftCreator />} />
          <Route path="/clusters/:id" element={<ClusterDetail />} />
          <Route path="/cluster-categories" element={<ClusterCategories />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/drafts" element={<Drafts />} />
          <Route path="/writer-history" element={<WriterHistory />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/drafts/:id" element={<DraftDetail />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/posts" element={<Posts />} />
        </Routes>
      </PageContainer>
    </ProLayout>
  );
}

const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
  },
};

function App() {
  return (
    <ConfigProvider locale={viVN} theme={theme}>
      <AntdApp>
        <ProConfigProvider token={theme.token} intl={viVNIntl}>
          <BrowserRouter basename="/admin">
            <LayoutContent />
          </BrowserRouter>
        </ProConfigProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
