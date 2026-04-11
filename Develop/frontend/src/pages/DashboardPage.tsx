/**
 * 儀表板頁面
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox,
  Box,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getOrganization, Organization } from '../services/organizationService';
import {
  getHomeNotifications,
  closeNotificationsToday,
  SystemNotification
} from '../services/systemNotificationsService';
import { getI18nValue } from '../utils/i18nHelper';
import '../styles/DashboardPage.css';

const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [orgLoading, setOrgLoading] = useState(false);

  // 通知 Modal 狀態
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState<number>(0);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [doNotShowToday, setDoNotShowToday] = useState<boolean>(false);

  // 載入今日通知
  useEffect(() => {
    loadTodayNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handlePreviousNotification = () => {
    if (currentNotificationIndex > 0) {
      setCurrentNotificationIndex(currentNotificationIndex - 1);
      setDoNotShowToday(false);
    }
  };

  const handleNextNotification = async () => {
    // 如果勾選「本日不再顯示」，標記今日關閉通知
    if (doNotShowToday) {
      try {
        await closeNotificationsToday();
        // 關閉所有通知
        setShowNotificationModal(false);
        setNotifications([]);
        setCurrentNotificationIndex(0);
        setDoNotShowToday(false);
        return;
      } catch (error) {
        console.error('Failed to close notifications today:', error);
      }
    }

    // 檢查是否還有下一則通知
    if (currentNotificationIndex < notifications.length - 1) {
      setCurrentNotificationIndex(currentNotificationIndex + 1);
      setDoNotShowToday(false); // 重置勾選狀態
    } else {
      // 沒有更多通知，關閉 Modal
      setShowNotificationModal(false);
      setNotifications([]);
      setCurrentNotificationIndex(0);
      setDoNotShowToday(false);
    }
  };

  const handleCloseNotification = async () => {
    // 如果勾選「本日不再顯示」，標記今日關閉通知
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

  // 取得組織資料
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

  const currentNotification = notifications[currentNotificationIndex];

  return (
    <div className="dashboard-page">
      <h2 className="dashboard-title">{t('dashboard.title')}</h2>
      <p className="dashboard-subtitle">{t('dashboard.titleEn')}</p>

      <div className="dashboard-cards">
        <div className="dashboard-card">
          <div className="card-icon">👤</div>
          <div className="card-content">
            <h3>{t('dashboard.userInfo')}</h3>
            <p className="card-value">{user?.username || '-'}</p>
            <p className="card-label">{user?.job_title || user?.department || '-'}</p>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-icon">📧</div>
          <div className="card-content">
            <h3>{t('dashboard.email')}</h3>
            <p className="card-value">{user?.account || '-'}</p>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-icon">🏢</div>
          <div className="card-content">
            <h3>{t('dashboard.organization')}</h3>
            <p className="card-value">
              {orgLoading ? t('common.loading') : (organization?.org_name || '-')}
            </p>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-icon">🔑</div>
          <div className="card-content">
            <h3>{t('dashboard.roles')}</h3>
            <p className="card-value">
              {t('dashboard.rolesCount', { count: user?.user_role?.length || 0 })}
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard-info">
        <h3>{t('sidebar.dashboard')}</h3>
        <p>
          {t('dashboard.systemDescription')}
        </p>
      </div>

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
                      fontWeight: 500
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
                  '& p:last-child': { marginBottom: 0 }
                }}
                dangerouslySetInnerHTML={{
                  __html: getI18nValue(currentNotification.notice_description, i18n.language)
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
                  <Button
                    onClick={handlePreviousNotification}
                    variant="outlined"
                  >
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
    </div>
  );
};

export default DashboardPage;
