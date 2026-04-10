/**
 * HomePage - 系統首頁
 * 使用者登入後的首頁儀表板
 */

import React, { useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { logView } from '../utils/userLogHelper';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // 記錄瀏覽日誌
  useEffect(() => {
    const initPage = async () => {
      try {
        await logView('dashboard', { action: 'view_home' });
      } catch (logErr) {
        console.error('[HomePage] Failed to log view:', logErr);
      }
    };
    initPage();
  }, []);

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t('home.welcome', '歡迎使用 PA6.4 管理系統')}
        </Typography>

        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('home.greeting', '您好')}, {user?.username || user?.account}
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            {t('home.organizationInfo', '您目前所屬組織')}: {user?.organization_id || 'N/A'}
          </Typography>

          <Typography variant="body1" color="text.secondary">
            {t('home.roleInfo', '您的角色')}: {user?.username || 'N/A'}
          </Typography>
        </Paper>

        {/* 統計卡片區域 */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                height: 140,
                bgcolor: 'primary.main',
                color: 'white'
              }}
            >
              <Typography variant="h6" gutterBottom>
                {t('home.stats.projects', '專案總數')}
              </Typography>
              <Typography variant="h3">
                -
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                height: 140,
                bgcolor: 'success.main',
                color: 'white'
              }}
            >
              <Typography variant="h6" gutterBottom>
                {t('home.stats.active', '進行中')}
              </Typography>
              <Typography variant="h3">
                -
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                height: 140,
                bgcolor: 'warning.main',
                color: 'white'
              }}
            >
              <Typography variant="h6" gutterBottom>
                {t('home.stats.pending', '待處理')}
              </Typography>
              <Typography variant="h3">
                -
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                height: 140,
                bgcolor: 'info.main',
                color: 'white'
              }}
            >
              <Typography variant="h6" gutterBottom>
                {t('home.stats.completed', '已完成')}
              </Typography>
              <Typography variant="h3">
                -
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* 最近活動區域 */}
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('home.recentActivities', '最近活動')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('home.noActivities', '目前沒有最近活動記錄')}
          </Typography>
        </Paper>

        {/* 快速連結區域 */}
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('home.quickLinks', '快速連結')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('home.noQuickLinks', '快速連結功能開發中...')}
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default HomePage;
