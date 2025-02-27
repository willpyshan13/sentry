import {Fragment, useMemo} from 'react';
import styled from '@emotion/styled';

import {t} from 'sentry/locale';
import HistogramQuery from 'sentry/utils/performance/histogram/histogramQuery';
import {Chart as HistogramChart} from 'sentry/views/performance/landing/chart/histogramChart';

import {GenericPerformanceWidget} from '../components/performanceWidget';
import {transformHistogramQuery} from '../transforms/transformHistogramQuery';
import {PerformanceWidgetProps, WidgetDataResult} from '../types';

type AreaDataType = {
  chart: WidgetDataResult & ReturnType<typeof transformHistogramQuery>;
};

export function HistogramWidget(props: PerformanceWidgetProps) {
  const {ContainerActions, location} = props;
  const globalSelection = props.eventView.getGlobalSelection();

  const Queries = useMemo(() => {
    return {
      chart: {
        fields: props.fields,
        component: provided => (
          <HistogramQuery
            {...provided}
            eventView={provided.eventView}
            location={props.location}
            numBuckets={20}
            dataFilter="exclude_outliers"
          />
        ),
        transform: transformHistogramQuery,
      },
    };
  }, [props.chartSetting]);

  const onFilterChange = () => {};

  return (
    <GenericPerformanceWidget<AreaDataType>
      {...props}
      Subtitle={() => (
        <Subtitle>
          {globalSelection.datetime.period
            ? t('In the last %s ', globalSelection.datetime.period)
            : t('In the last period')}
        </Subtitle>
      )}
      HeaderActions={provided => (
        <Fragment>
          <ContainerActions {...provided.widgetData.chart} />
        </Fragment>
      )}
      Queries={Queries}
      Visualizations={[
        {
          component: provided => (
            <HistogramChart
              {...provided}
              colors={props.chartColor ? [props.chartColor] : undefined}
              location={location}
              isLoading={false}
              isErrored={false}
              onFilterChange={onFilterChange}
              field={props.fields[0]}
              chartData={provided.widgetData.chart?.data?.[props.fields[0]]}
              disableXAxis
              disableZoom
              disableChartPadding
            />
          ),
          height: props.chartHeight,
        },
      ]}
    />
  );
}

const Subtitle = styled('span')`
  color: ${p => p.theme.gray300};
  font-size: ${p => p.theme.fontSizeMedium};
`;
