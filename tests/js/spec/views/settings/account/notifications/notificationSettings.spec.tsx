import {mountWithTheme} from 'sentry-test/enzyme';
import {initializeOrg} from 'sentry-test/initializeOrg';

import {NotificationSettingsObject} from 'sentry/views/settings/account/notifications/constants';
import NotificationSettings from 'sentry/views/settings/account/notifications/notificationSettings';

const createWrapper = (notificationSettings: NotificationSettingsObject) => {
  const {routerContext} = initializeOrg();
  MockApiClient.addMockResponse({
    url: '/users/me/notification-settings/',
    method: 'GET',
    body: notificationSettings,
  });

  MockApiClient.addMockResponse({
    url: '/users/me/notifications/',
    method: 'GET',
    body: {
      personalActivityNotifications: true,
      selfAssignOnResolve: true,
      weeklyReports: true,
    },
  });

  return mountWithTheme(<NotificationSettings />, routerContext);
};

describe('NotificationSettings', function () {
  it('should render', function () {
    const wrapper = createWrapper({
      alerts: {user: {me: {email: 'never', slack: 'never'}}},
      deploy: {user: {me: {email: 'never', slack: 'never'}}},
      workflow: {user: {me: {email: 'never', slack: 'never'}}},
    });

    // There are 8 notification setting Selects/Toggles.
    const fields = wrapper.find('Field');
    expect(fields).toHaveLength(8);
  });
});
