/**
 * @format
 */

import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-native-onesignal', () => ({
  OneSignal: {
    initialize: jest.fn(),
    Debug: {
      setLogLevel: jest.fn(),
    },
    Notifications: {
      requestPermission: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    User: {
      pushSubscription: {
        getTokenAsync: jest.fn().mockResolvedValue('mock-push-token'),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
    },
  },
}));

jest.mock('../src/services/translateService', () => ({
  loadTranslations: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/utils/storageService', () => ({
  saveItem: jest.fn(),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn(),
}));

jest.mock('../src/navigation/AppNavigator', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => React.createElement(Text, null, 'App Navigator');
});

jest.mock('../src/screens/LoadingScreen', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => React.createElement(Text, null, 'Loading Screen');
});

test('renders correctly', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
  });
});
