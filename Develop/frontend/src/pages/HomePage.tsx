/**
 * HomePage - 系統首頁
 * 使用者登入後的首頁（整合系統通知、組織資料、快速資訊）
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getOrganization, Organization } from '../services/organizationService';
import {
  getHomeNotifications,
  closeNotificationsToday,
  SystemNotification,
} from '../services/systemNotificationsService';
import { systemService, SystemStats } from '../api/systemService';
import { getI18nValue } from '../utils/i18nHelper';

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  // 組織資料
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [orgLoading, setOrgLoading] = useState(false);

  // 首頁統計資料
  const [stats, setStats] = useState<SystemStats | null>(null);

  // 系統通知 Modal 狀態
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState<number>(0);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [doNotShowToday, setDoNotShowToday] = useState<boolean>(false);

  // 載入首頁統計
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await systemService.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    fetchStats();
  }, []);

  // 載入組織資料
  useEffect(() => {
    const fetchOrganization = async () => {
      if (user?.organization_id) {
        try {
          setOrgLoading(true);
          const orgData = await getOrganization(user.organization_id);
          setOrganization(orgData);
        } catch (error) {
          console.error('Failed to fetch organization:', error);
        } finally {
          setOrgLoading(false);
        }
      }
    };
    fetchOrganization();
  }, [user?.organization_id]);

  // 載入今日系統通知
  useEffect(() => {
    const loadTodayNotifications = async () => {
      try {
        const response = await getHomeNotifications();
        if (response.notifications && response.notifications.length > 0) {
          setNotifications(response.notifications);
          setCurrentNotificationIndex(0);
          setShowNotificationModal(true);
        }
      } catch (error) {
        console.error('Failed to load today notifications:', error);
      }
    };
    loadTodayNotifications();
  }, []);

  const handlePreviousNotification = () => {
    if (currentNotificationIndex > 0) {
      setCurrentNotificationIndex(currentNotificationIndex - 1);
      setDoNotShowToday(false);
    }
  };

  const handleNextNotification = async () => {
    if (doNotShowToday) {
      try {
        await closeNotificationsToday();
        setShowNotificationModal(false);
        setNotifications([]);
        setCurrentNotificationIndex(0);
        setDoNotShowToday(false);
        return;
      } catch (error) {
        console.error('Failed to close notifications today:', error);
      }
    }

    if (currentNotificationIndex < notifications.length - 1) {
      setCurrentNotificationIndex(currentNotificationIndex + 1);
      setDoNotShowToday(false);
    } else {
      setShowNotificationModal(false);
      setNotifications([]);
      setCurrentNotificationIndex(0);
      setDoNotShowToday(false);
    }
  };

  const handleCloseNotification = async () => {
    if (doNotShowToday) {
      try {
        await closeNotificationsToday();
      } catch (error) {
        console.error('Failed to close notifications today:', error);
      }
    }
    setShowNotificationModal(false);
    setNotifications([]);
    setCurrentNotificationIndex(0);
    setDoNotShowToday(false);
  };

  const currentNotification = notifications[currentNotificationIndex];
  const roleCount = user?.user_role?.length || 0;

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t('home.welcome', '歡迎使用後臺管理基底平台')}
        </Typography>

        {/* 使用者歡迎卡片 */}
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('home.greeting', '您好')}, {user?.username || user?.account}
          </Typography>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {t('user.account', '帳號')}
              </Typography>
              <Typography variant="body1">{user?.account || '-'}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {t('home.organizationInfo', '您目前所屬組織')}
              </Typography>
              <Typography variant="body1">
                {orgLoading ? t('common.loading', '載入中...') : (organization?.org_name || '-')}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.roles', '角色權限')}
              </Typography>
              <Typography variant="body1">
                {t('dashboard.rolesCount', { count: roleCount })}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {t('user.jobTitle', '職稱')}
              </Typography>
              <Typography variant="body1">
                {user?.job_title || user?.department || '-'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* 統計卡片區域 */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', height: 140, bgcolor: 'primary.main', color: 'white' }}>
              <Typography variant="h6" gutterBottom>
                {t('home.stats.users', '使用者總數')}
              </Typography>
              <Typography variant="h3">{stats?.users_count ?? '-'}</Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', height: 140, bgcolor: 'success.main', color: 'white' }}>
              <Typography variant="h6" gutterBottom>
                {t('home.stats.organizations', '組織總數')}
              </Typography>
              <Typography variant="h3">{stats?.organizations_count ?? '-'}</Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', height: 140, bgcolor: 'warning.main', color: 'white' }}>
              <Typography variant="h6" gutterBottom>
                {t('home.stats.recentLogins', '近 7 日登入')}
              </Typography>
              <Typography variant="h3">{stats?.recent_logins_7d ?? '-'}</Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', height: 140, bgcolor: 'info.main', color: 'white' }}>
              <Typography variant="h6" gutterBottom>
                {t('home.stats.activeNotifications', '作用中通知')}
              </Typography>
              <Typography variant="h3">{stats?.active_notifications ?? '-'}</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* 最近活動區域 */}
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('home.recentActivities', '最近活動')}
          </Typography>
          {stats && stats.recent_activities.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {stats.recent_activities.map(act => (
                <Box
                  key={act.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    py: 1,
                    borderBottom: '1px solid #eee',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Box sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: act.has_error ? 'error.lighter' : 'primary.lighter',
                    color: act.has_error ? 'error.main' : 'primary.main',
                    fontSize: '0.75em',
                    fontWeight: 600,
                    minWidth: 56,
                    textAlign: 'center',
                  }}>
                    {act.module_item}
                  </Box>
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    <strong>{act.username}</strong>
                    {act.func_name && (
                      <> — {getI18nValue(act.func_name, i18n.language)}</>
                    )}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {act.action_at ? new Date(act.action_at).toLocaleString(i18n.language) : '-'}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('home.noActivities', '目前沒有最近活動記錄')}
            </Typography>
          )}
        </Paper>
      </Box>

      {/* 系統通知 Modal */}
      <Dialog
        open={showNotificationModal}
        onClose={handleCloseNotification}
        maxWidth="md"
        fullWidth
      >
        {currentNotification && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6" component="span">
                  {t('system_notifications.systemAnnouncement', '系統公告')}
                </Typography>
                {notifications.length > 1 && (
                  <Typography
                    variant="body2"
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      fontWeight: 500,
                    }}
                  >
                    {currentNotificationIndex + 1} / {notifications.length}
                  </Typography>
                )}
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#2c3e50' }}>
                {getI18nValue(currentNotification.notice_subject, i18n.language)}
              </Typography>
              <Box
                sx={{
                  '& p': { marginTop: 0, marginBottom: '1em' },
                  '& p:last-child': { marginBottom: 0 },
                }}
                dangerouslySetInnerHTML={{
                  __html: getI18nValue(currentNotification.notice_description, i18n.language),
                }}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={doNotShowToday}
                    onChange={(e) => setDoNotShowToday(e.target.checked)}
                  />
                }
                label={t('system_notifications.doNotShowToday', '本日不再顯示')}
                sx={{ mr: 'auto' }}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                {notifications.length > 1 && currentNotificationIndex > 0 && (
                  <Button onClick={handlePreviousNotification} variant="outlined">
                    {t('system_notifications.previousNotification', '上一則')}
                  </Button>
                )}
                <Button onClick={handleCloseNotification} variant="outlined" color="inherit">
                  {t('common.close', '關閉')}
                </Button>
                {currentNotificationIndex < notifications.length - 1 && (
                  <Button onClick={handleNextNotification} variant="contained">
                    {t('system_notifications.nextNotification', '下一則')}
                  </Button>
                )}
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default HomePage;
