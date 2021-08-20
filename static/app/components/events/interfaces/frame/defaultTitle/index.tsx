import * as React from 'react';
import styled from '@emotion/styled';

import AnnotatedText from 'app/components/events/meta/annotatedText';
import {getMeta} from 'app/components/events/meta/metaProxy';
import ExternalLink from 'app/components/links/externalLink';
import {STACKTRACE_PREVIEW_TOOLTIP_DELAY} from 'app/components/stacktracePreview';
import Tooltip from 'app/components/tooltip';
import Truncate from 'app/components/truncate';
import {IconOpen, IconQuestion} from 'app/icons';
import {t} from 'app/locale';
import space from 'app/styles/space';
import {Frame, Meta, PlatformType} from 'app/types';
import {defined, isUrl} from 'app/utils';

import FunctionName from '../functionName';
import GroupingIndicator from '../groupingIndicator';
import {getPlatform, isDotnet, trimPackage} from '../utils';

import OriginalSourceInfo from './originalSourceInfo';

type Props = {
  frame: Frame;
  platform: PlatformType;
  isUsedForGrouping?: boolean;
  /**
   * Is the stack trace being previewed in a hovercard?
   */
  isHoverPreviewed?: boolean;
};

type GetPathNameOutput = {key: string; value: string; meta?: Meta};

const DefaultTitle = ({frame, platform, isHoverPreviewed, isUsedForGrouping}: Props) => {
  const title: Array<React.ReactElement> = [];
  const framePlatform = getPlatform(frame.platform, platform);
  const tooltipDelay = isHoverPreviewed ? STACKTRACE_PREVIEW_TOOLTIP_DELAY : undefined;

  const handleExternalLink = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  const getModule = (): GetPathNameOutput | undefined => {
    if (frame.module) {
      return {
        key: 'module',
        value: frame.module,
        meta: getMeta(frame, 'module'),
      };
    }

    return undefined;
  };

  const getPathNameOrModule = (
    shouldPrioritizeModuleName: boolean
  ): GetPathNameOutput | undefined => {
    if (shouldPrioritizeModuleName) {
      if (frame.module) {
        return getModule();
      }
      if (frame.filename) {
        return {
          key: 'filename',
          value: frame.filename,
          meta: getMeta(frame, 'filename'),
        };
      }
      return undefined;
    }

    if (frame.filename) {
      return {
        key: 'filename',
        value: frame.filename,
        meta: getMeta(frame, 'filename'),
      };
    }

    if (frame.module) {
      return getModule();
    }

    return undefined;
  };

  // TODO(dcramer): this needs to use a formatted string so it can be
  // localized correctly
  if (defined(frame.filename || frame.module)) {
    // prioritize module name for Java as filename is often only basename
    const shouldPrioritizeModuleName = framePlatform === 'java';

    // we do not want to show path in title on csharp platform
    const pathNameOrModule = isDotnet(framePlatform)
      ? getModule()
      : getPathNameOrModule(shouldPrioritizeModuleName);
    const enablePathTooltip =
      defined(frame.absPath) && frame.absPath !== pathNameOrModule?.value;

    if (pathNameOrModule) {
      title.push(
        <Tooltip
          key={pathNameOrModule.key}
          title={frame.absPath}
          disabled={!enablePathTooltip}
          delay={tooltipDelay}
        >
          <code key="filename" className="filename">
            <AnnotatedText
              value={<Truncate value={pathNameOrModule.value} maxLength={100} leftTrim />}
              meta={pathNameOrModule.meta}
            />
          </code>
        </Tooltip>
      );
    }

    // in case we prioritized the module name but we also have a filename info
    // we want to show a litle (?) icon that on hover shows the actual filename
    if (shouldPrioritizeModuleName && frame.filename) {
      title.push(
        <Tooltip key={frame.filename} title={frame.filename} delay={tooltipDelay}>
          <a className="in-at real-filename">
            <IconQuestion size="xs" />
          </a>
        </Tooltip>
      );
    }

    if (frame.absPath && isUrl(frame.absPath)) {
      title.push(
        <StyledExternalLink href={frame.absPath} key="share" onClick={handleExternalLink}>
          <IconOpen size="xs" />
        </StyledExternalLink>
      );
    }

    if (
      (defined(frame.function) || defined(frame.rawFunction)) &&
      defined(pathNameOrModule)
    ) {
      title.push(
        <InFramePosition className="in-at" key="in">
          {` ${t('in')} `}
        </InFramePosition>
      );
    }
  }

  if (defined(frame.function) || defined(frame.rawFunction)) {
    title.push(<FunctionName frame={frame} key="function" className="function" />);
  }

  // we don't want to render out zero line numbers which are used to
  // indicate lack of source information for native setups.  We could
  // TODO(mitsuhiko): only do this for events from native platforms?
  if (defined(frame.lineNo) && frame.lineNo !== 0) {
    title.push(
      <InFramePosition className="in-at in-at-line" key="no">
        {` ${t('at line')} `}
      </InFramePosition>
    );
    title.push(
      <code key="line" className="lineno">
        {defined(frame.colNo) ? `${frame.lineNo}:${frame.colNo}` : frame.lineNo}
      </code>
    );
  }

  if (defined(frame.package) && !isDotnet(framePlatform)) {
    title.push(<InFramePosition key="within">{` ${t('within')} `}</InFramePosition>);
    title.push(
      <code title={frame.package} className="package" key="package">
        {trimPackage(frame.package)}
      </code>
    );
  }

  if (defined(frame.origAbsPath)) {
    title.push(
      <Tooltip
        key="info-tooltip"
        title={<OriginalSourceInfo mapUrl={frame.mapUrl} map={frame.map} />}
        delay={tooltipDelay}
      >
        <a className="in-at original-src">
          <IconQuestion size="xs" />
        </a>
      </Tooltip>
    );
  }

  if (isUsedForGrouping) {
    title.push(<StyledGroupingIndicator key="info-tooltip" />);
  }

  return <React.Fragment>{title}</React.Fragment>;
};

export default DefaultTitle;

const StyledExternalLink = styled(ExternalLink)`
  position: relative;
  top: ${space(0.25)};
  margin-left: ${space(0.5)};
`;

const InFramePosition = styled('span')`
  color: ${p => p.theme.textColor};
  opacity: 0.6;
`;

const StyledGroupingIndicator = styled(GroupingIndicator)`
  margin-left: ${space(0.75)};
`;
