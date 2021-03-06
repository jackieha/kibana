/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, Fragment, FC, useMemo, useCallback } from 'react';
import { Router } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
  EuiTabbedContentTab,
} from '@elastic/eui';

import { PLUGIN_ID } from '../../../../../../common/constants/app';
import { createSpacesContext, SpacesContext } from '../../../../contexts/spaces';
import { ManagementAppMountParams } from '../../../../../../../../../src/plugins/management/public/';

import { checkGetManagementMlJobsResolver } from '../../../../capabilities/check_capabilities';
import {
  KibanaContextProvider,
  RedirectAppLinks,
} from '../../../../../../../../../src/plugins/kibana_react/public';

import { getDocLinks } from '../../../../util/dependency_cache';
// @ts-ignore undeclared module
import { JobsListView } from '../../../../jobs/jobs_list/components/jobs_list_view/index';
import { DataFrameAnalyticsList } from '../../../../data_frame_analytics/pages/analytics_management/components/analytics_list';
import { AccessDeniedPage } from '../access_denied_page';
import { SharePluginStart } from '../../../../../../../../../src/plugins/share/public';
import { SpacesPluginStart } from '../../../../../../../spaces/public';
import { JobSpacesSyncFlyout } from '../../../../components/job_spaces_sync';
import { getDefaultAnomalyDetectionJobsListState } from '../../../../jobs/jobs_list/jobs';
import { getMlGlobalServices } from '../../../../app';
import { ListingPageUrlState } from '../../../../../../common/types/common';
import { getDefaultDFAListState } from '../../../../data_frame_analytics/pages/analytics_management/page';

interface Tab extends EuiTabbedContentTab {
  'data-test-subj': string;
}

function usePageState<T extends ListingPageUrlState>(
  defaultState: T
): [T, (update: Partial<T>) => void] {
  const [pageState, setPageState] = useState<T>(defaultState);

  const updateState = useCallback(
    (update: Partial<T>) => {
      setPageState({
        ...pageState,
        ...update,
      });
    },
    [pageState]
  );

  return [pageState, updateState];
}

function useTabs(isMlEnabledInSpace: boolean, spacesEnabled: boolean): Tab[] {
  const [adPageState, updateAdPageState] = usePageState(getDefaultAnomalyDetectionJobsListState());
  const [dfaPageState, updateDfaPageState] = usePageState(getDefaultDFAListState());

  return useMemo(
    () => [
      {
        'data-test-subj': 'mlStackManagementJobsListAnomalyDetectionTab',
        id: 'anomaly_detection_jobs',
        name: i18n.translate('xpack.ml.management.jobsList.anomalyDetectionTab', {
          defaultMessage: 'Anomaly detection',
        }),
        content: (
          <Fragment>
            <EuiSpacer size="m" />
            <JobsListView
              jobsViewState={adPageState}
              onJobsViewStateUpdate={updateAdPageState}
              isManagementTable={true}
              isMlEnabledInSpace={isMlEnabledInSpace}
              spacesEnabled={spacesEnabled}
            />
          </Fragment>
        ),
      },
      {
        'data-test-subj': 'mlStackManagementJobsListAnalyticsTab',
        id: 'analytics_jobs',
        name: i18n.translate('xpack.ml.management.jobsList.analyticsTab', {
          defaultMessage: 'Analytics',
        }),
        content: (
          <Fragment>
            <EuiSpacer size="m" />
            <DataFrameAnalyticsList
              isManagementTable={true}
              isMlEnabledInSpace={isMlEnabledInSpace}
              spacesEnabled={spacesEnabled}
              pageState={dfaPageState}
              updatePageState={updateDfaPageState}
            />
          </Fragment>
        ),
      },
    ],
    [isMlEnabledInSpace, adPageState, updateAdPageState, dfaPageState, updateDfaPageState]
  );
}

export const JobsListPage: FC<{
  coreStart: CoreStart;
  share: SharePluginStart;
  history: ManagementAppMountParams['history'];
  spaces?: SpacesPluginStart;
}> = ({ coreStart, share, history, spaces }) => {
  const spacesEnabled = spaces !== undefined;
  const [initialized, setInitialized] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [showSyncFlyout, setShowSyncFlyout] = useState(false);
  const [isMlEnabledInSpace, setIsMlEnabledInSpace] = useState(false);
  const tabs = useTabs(isMlEnabledInSpace, spacesEnabled);
  const [currentTabId, setCurrentTabId] = useState(tabs[0].id);
  const I18nContext = coreStart.i18n.Context;
  const spacesContext = useMemo(() => createSpacesContext(coreStart.http, spacesEnabled), []);

  const check = async () => {
    try {
      const { mlFeatureEnabledInSpace } = await checkGetManagementMlJobsResolver();
      setIsMlEnabledInSpace(mlFeatureEnabledInSpace);
      spacesContext.spacesEnabled = spacesEnabled;
      if (spacesEnabled && spacesContext.spacesManager !== null) {
        spacesContext.allSpaces = (await spacesContext.spacesManager.getSpaces()).filter(
          (space) => space.disabledFeatures.includes(PLUGIN_ID) === false
        );
      }
    } catch (e) {
      setAccessDenied(true);
    }
    setInitialized(true);
  };

  useEffect(() => {
    check();
  }, []);

  if (initialized === false) {
    return null;
  }

  const docLinks = getDocLinks();
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;
  const anomalyDetectionJobsUrl = `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-jobs.html`;
  const anomalyJobsUrl = `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-dfanalytics.html`;

  const anomalyDetectionDocsLabel = i18n.translate(
    'xpack.ml.management.jobsList.anomalyDetectionDocsLabel',
    {
      defaultMessage: 'Anomaly detection jobs docs',
    }
  );
  const analyticsDocsLabel = i18n.translate('xpack.ml.management.jobsList.analyticsDocsLabel', {
    defaultMessage: 'Analytics jobs docs',
  });

  function renderTabs() {
    return (
      <EuiTabbedContent
        onTabClick={({ id }: { id: string }) => {
          setCurrentTabId(id);
        }}
        size="s"
        tabs={tabs}
        initialSelectedTab={tabs[0]}
      />
    );
  }

  function onCloseSyncFlyout() {
    setShowSyncFlyout(false);
  }

  if (accessDenied) {
    return <AccessDeniedPage />;
  }

  return (
    <RedirectAppLinks application={coreStart.application}>
      <I18nContext>
        <KibanaContextProvider
          services={{ ...coreStart, share, mlServices: getMlGlobalServices(coreStart.http) }}
        >
          <SpacesContext.Provider value={spacesContext}>
            <Router history={history}>
              <EuiPageContent
                id="kibanaManagementMLSection"
                data-test-subj="mlPageStackManagementJobsList"
              >
                <EuiTitle size="l">
                  <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <h1>
                        {i18n.translate('xpack.ml.management.jobsList.jobsListTitle', {
                          defaultMessage: 'Machine Learning Jobs',
                        })}
                      </h1>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        target="_blank"
                        iconType="help"
                        iconSide="left"
                        color="primary"
                        href={
                          currentTabId === 'anomaly_detection_jobs'
                            ? anomalyDetectionJobsUrl
                            : anomalyJobsUrl
                        }
                      >
                        {currentTabId === 'anomaly_detection_jobs'
                          ? anomalyDetectionDocsLabel
                          : analyticsDocsLabel}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiTitle size="s">
                  <EuiText color="subdued">
                    {i18n.translate('xpack.ml.management.jobsList.jobsListTagline', {
                      defaultMessage: 'View machine learning analytics and anomaly detection jobs.',
                    })}
                  </EuiText>
                </EuiTitle>
                <EuiSpacer size="l" />
                <EuiPageContentBody>
                  {spacesEnabled && (
                    <>
                      <EuiButtonEmpty onClick={() => setShowSyncFlyout(true)}>
                        {i18n.translate('xpack.ml.management.jobsList.syncFlyoutButton', {
                          defaultMessage: 'Synchronize saved objects',
                        })}
                      </EuiButtonEmpty>
                      {showSyncFlyout && <JobSpacesSyncFlyout onClose={onCloseSyncFlyout} />}
                      <EuiSpacer size="s" />
                    </>
                  )}
                  {renderTabs()}
                </EuiPageContentBody>
              </EuiPageContent>
            </Router>
          </SpacesContext.Provider>
        </KibanaContextProvider>
      </I18nContext>
    </RedirectAppLinks>
  );
};
