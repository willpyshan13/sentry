import styled from '@emotion/styled';

import TextOverflow from 'sentry/components/textOverflow';
import Tooltip from 'sentry/components/tooltip';
import {IconFire} from 'sentry/icons';
import {t, tct} from 'sentry/locale';
import {EntryData} from 'sentry/types';
import {Color} from 'sentry/utils/theme';

import {Grid, GridCell} from './styles';

type Props = {
  id: number;
  details: ThreadInfo;
  crashedInfo?: EntryData;
  name?: string | null;
  crashed?: boolean;
};

type ThreadInfo = {
  label?: string;
  filename?: string;
};

const Option = ({id, details, name, crashed, crashedInfo}: Props) => {
  const {label = `<${t('unknown')}>`, filename = `<${t('unknown')}>`} = details;
  const optionName = name || `<${t('unknown')}>`;

  return (
    <Grid>
      <GridCell>
        <InnerCell>
          <Tooltip title={`#${id}`} position="top">
            <TextOverflow>{`#${id}`}</TextOverflow>
          </Tooltip>
        </InnerCell>
      </GridCell>
      <GridCell>
        <InnerCell isBold>
          <Tooltip title={optionName} position="top">
            <TextOverflow>{optionName}</TextOverflow>
          </Tooltip>
        </InnerCell>
      </GridCell>
      <GridCell>
        <InnerCell color="blue300">
          <Tooltip title={label} position="top">
            <TextOverflow>{label}</TextOverflow>
          </Tooltip>
        </InnerCell>
      </GridCell>
      <GridCell>
        <InnerCell color="purple300">
          <Tooltip title={filename} position="top">
            <TextOverflow>{filename}</TextOverflow>
          </Tooltip>
        </InnerCell>
      </GridCell>
      <GridCell>
        {crashed && (
          <InnerCell isCentered>
            {crashedInfo ? (
              <Tooltip
                skipWrapper
                title={tct('Errored with [crashedInfo]', {
                  crashedInfo: crashedInfo.values[0].type,
                })}
                position="top"
              >
                <IconFire color="red300" />
              </Tooltip>
            ) : (
              <IconFire color="red300" />
            )}
          </InnerCell>
        )}
      </GridCell>
    </Grid>
  );
};

export default Option;

const InnerCell = styled('div')<{isCentered?: boolean; color?: Color; isBold?: boolean}>`
  display: flex;
  align-items: center;
  justify-content: ${p => (p.isCentered ? 'center' : 'flex-start')};
  font-weight: ${p => (p.isBold ? 600 : 400)};
  ${p => p.color && `color: ${p.theme[p.color]}`}
`;
