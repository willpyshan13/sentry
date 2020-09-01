import React from 'react';
import {browserHistory} from 'react-router';
import * as ReactRouter from 'react-router';
import {Location} from 'history';

import {OrganizationSummary} from 'app/types';
import {Client} from 'app/api';
import {t} from 'app/locale';
import AreaChart from 'app/components/charts/areaChart';
import ChartZoom from 'app/components/charts/chartZoom';
import ErrorPanel from 'app/components/charts/errorPanel';
import TransparentLoadingMask from 'app/components/charts/transparentLoadingMask';
import TransitionChart from 'app/components/charts/transitionChart';
import EventsRequest from 'app/components/charts/eventsRequest';
import ReleaseSeries from 'app/components/charts/releaseSeries';
import QuestionTooltip from 'app/components/questionTooltip';
import {getInterval} from 'app/components/charts/utils';
import {IconWarning} from 'app/icons';
import {getUtcToLocalDateObject} from 'app/utils/dates';
import EventView from 'app/utils/discover/eventView';
import withApi from 'app/utils/withApi';
import {decodeScalar} from 'app/utils/queryString';
import theme from 'app/utils/theme';
import {tooltipFormatter, axisLabelFormatter} from 'app/utils/discover/charts';
import {getDuration, formatAbbreviatedNumber} from 'app/utils/formatters';
import getDynamicText from 'app/utils/getDynamicText';

import {HeaderTitleLegend} from '../styles';

const QUERY_KEYS = [
  'environment',
  'project',
  'query',
  'start',
  'end',
  'statsPeriod',
] as const;

type ViewProps = Pick<EventView, typeof QUERY_KEYS[number]>;

type Props = ReactRouter.WithRouterProps &
  ViewProps & {
    api: Client;
    location: Location;
    organization: OrganizationSummary;
  };

const YAXIS_VALUES = ['p50()', 'p75()', 'p95()', 'p99()', 'p100()', 'epm()'];

type State = {
  throughputGridLeftOffset: string;
};

/**
 * Fetch and render a stacked area chart that shows duration
 * percentiles over the past 7 days
 */
class DurationChart extends React.Component<Props, State> {
  chartValues = {
    durationGridWidth: 0,
    throughputGridWidth: 0,
  };

  state: State = {
    throughputGridLeftOffset: '10px',
  };

  handleLegendSelectChanged = legendChange => {
    const {location} = this.props;
    const {selected} = legendChange;
    const unselected = Object.keys(selected).filter(key => !selected[key]);

    const to = {
      ...location,
      query: {
        ...location.query,
        unselectedSeries: unselected,
      },
    };
    browserHistory.push(to);
  };

  handleInternalGridResize = (axesList, gridModel, estimateLabelUnionRect) => {
    let {durationGridWidth, throughputGridWidth} = this.chartValues;
    let newDurationGridWidth = durationGridWidth;
    let newThroughputGridWidth = throughputGridWidth;
    const index = gridModel.componentIndex;
    axesList.forEach(axis => {
      const {dim} = axis;
      if (index === 0 && dim === 'y') {
        const labelUnionRect = estimateLabelUnionRect(axis);
        if (labelUnionRect) {
          newDurationGridWidth = labelUnionRect.width;
        }
      } else if (index === 1 && dim === 'y') {
        const labelUnionRect = estimateLabelUnionRect(axis);
        if (labelUnionRect) {
          newThroughputGridWidth = labelUnionRect.width;
        }
      }
    });

    this.chartValues.durationGridWidth = newDurationGridWidth;
    this.chartValues.throughputGridWidth = newThroughputGridWidth;

    if (
      newThroughputGridWidth === 0 ||
      newDurationGridWidth === 0 ||
      (newThroughputGridWidth === throughputGridWidth &&
        newDurationGridWidth === durationGridWidth)
    ) {
      return;
    }

    this.setState({
      throughputGridLeftOffset: `${(
        newDurationGridWidth -
        newThroughputGridWidth +
        10
      ).toFixed(0)}px`,
    });
  };

  render() {
    const {
      api,
      project,
      environment,
      location,
      organization,
      query,
      statsPeriod,
      router,
    } = this.props;
    const {throughputGridLeftOffset} = this.state;

    const unselectedSeries = location.query.unselectedSeries ?? [];
    const unselectedMetrics = Array.isArray(unselectedSeries)
      ? unselectedSeries
      : [unselectedSeries];
    const seriesSelection = unselectedMetrics.reduce((selection, metric) => {
      selection[metric] = false;
      return selection;
    }, {});

    const start = this.props.start
      ? getUtcToLocalDateObject(this.props.start)
      : undefined;

    const end = this.props.end ? getUtcToLocalDateObject(this.props.end) : undefined;
    const utc = decodeScalar(router.location.query.utc);

    const datetimeSelection = {
      start: start || null,
      end: end || null,
      period: statsPeriod,
    };

    const axisLineConfig = {
      scale: true,
      splitLine: {
        show: false,
      },
    };

    const areaChartProps = {
      height: 280,
      legend: {
        right: 10,
        top: 0,
        icon: 'circle',
        itemHeight: 8,
        itemWidth: 8,
        itemGap: 12,
        align: 'left',
        textStyle: {
          verticalAlign: 'top',
          fontSize: 11,
          fontFamily: 'Rubik',
        },
        selected: seriesSelection,
      },
      seriesOptions: {
        showSymbol: false,
      },
      tooltip: {
        valueFormatter(value: number, seriesName: string) {
          if (seriesName === 'epm()') {
            return value.toLocaleString();
          }
          return getDuration(value / 1000, 2);
        },
      },
      axisPointer: {
        // Link the two series x-axis together.
        link: [{xAxisIndex: [0, 1]}],
      },
      xAxes: [
        {
          gridIndex: 0,
          type: 'time',
          axisLabel: {show: false},
          axisTick: {show: false},
        },
        {
          gridIndex: 1,
          type: 'time',
        },
      ],
      yAxes: [
        // durations
        {
          gridIndex: 0,
          scale: true,
          axisLabel: {
            color: theme.gray400,
            // p50 coerces the axis to be time based
            formatter: (value: number) => axisLabelFormatter(value, 'p50()'),
          },
          ...axisLineConfig,
        },
        // throughput
        {
          gridIndex: 1,
          scale: true,
          axisLabel: {
            color: theme.gray400,
            formatter: (value: number) => axisLabelFormatter(value, 'count()'),
          },
          ...axisLineConfig,
        },
      ],
      grid: [
        {
          left: '10px',
          right: '10px',
          top: '40px',
          bottom: '20px',
          height: '170px',
        },
        {
          left: throughputGridLeftOffset,
          right: '10px',
          top: '225px',
          bottom: '0px',
          height: '55px',
          containLabel: true,
        },
      ],
    };

    return (
      <React.Fragment>
        <HeaderTitleLegend>
          {t('Duration Breakdown')}
          <QuestionTooltip
            size="sm"
            position="top"
            title={t(
              `Duration Breakdown reflects transaction durations by percentile over time.`
            )}
          />
        </HeaderTitleLegend>
        <ChartZoom
          router={router}
          period={statsPeriod}
          projects={project}
          environments={environment}
        >
          {zoomRenderProps => (
            <EventsRequest
              api={api}
              organization={organization}
              period={statsPeriod}
              project={[...project]}
              environment={[...environment]}
              start={start}
              end={end}
              interval={getInterval(datetimeSelection, true)}
              showLoading={false}
              query={query}
              includePrevious={false}
              yAxis={YAXIS_VALUES}
            >
              {({results, errored, loading, reloading}) => {
                if (errored) {
                  return (
                    <ErrorPanel>
                      <IconWarning color="gray500" size="lg" />
                    </ErrorPanel>
                  );
                }
                const colors =
                  (results && theme.charts.getColorPalette(results.length - 2)) || [];

                // Create a list of series based on the order of the fields,
                // We need to flip it at the end to ensure the series stack right.
                const series = results
                  ? results
                      .map((values, i: number) => {
                        // Count should be in a smaller chart below the timeseries.
                        const axisIndex = values.seriesName === 'epm()' ? 1 : 0;
                        const type = values.seriesName === 'epm()' ? 'bar' : 'line';
                        return {
                          ...values,
                          yAxisIndex: axisIndex,
                          xAxisIndex: axisIndex,
                          type,
                          color: colors[i],
                          lineStyle: {
                            opacity: 0,
                          },
                        };
                      })
                      .reverse()
                  : [];

                // Stack the toolbox under the legend.
                // so all series names are clickable.
                zoomRenderProps.toolBox.z = -1;

                return (
                  <ReleaseSeries
                    start={start}
                    end={end}
                    period={statsPeriod}
                    utc={utc}
                    projects={project}
                  >
                    {({releaseSeries}) => (
                      <TransitionChart loading={loading} reloading={reloading}>
                        <TransparentLoadingMask visible={reloading} />
                        {getDynamicText({
                          value: (
                            <AreaChart
                              {...areaChartProps}
                              {...zoomRenderProps}
                              onLegendSelectChanged={this.handleLegendSelectChanged}
                              series={[...series, ...releaseSeries]}
                              isExtended
                              onInternalGridResize={this.handleInternalGridResize}
                            />
                          ),
                          fixed: 'Duration Chart',
                        })}
                      </TransitionChart>
                    )}
                  </ReleaseSeries>
                );
              }}
            </EventsRequest>
          )}
        </ChartZoom>
      </React.Fragment>
    );
  }
}

export default withApi(ReactRouter.withRouter(DurationChart));
