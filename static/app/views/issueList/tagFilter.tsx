import * as React from 'react';
import styled from '@emotion/styled';
import debounce from 'lodash/debounce';

import {addErrorMessage} from 'sentry/actionCreators/indicator';
import {Client} from 'sentry/api';
import SelectControl from 'sentry/components/forms/selectControl';
import {t, tct} from 'sentry/locale';
import space from 'sentry/styles/space';
import {Tag, TagValue} from 'sentry/types';
import Input from 'sentry/views/settings/components/forms/controls/input';

import {TagValueLoader} from './types';

const defaultProps = {
  value: '',
};

type SelectOption = Record<'value' | 'label', string>;

type Props = {
  tag: Tag;
  onSelect: (tag: Tag, value: string | null) => void;
  tagValueLoader: TagValueLoader;
} & typeof defaultProps;

type State = {
  query: string;
  isLoading: boolean;
  value: string | null;
  textValue: string;
  options?: SelectOption[];
};

class IssueListTagFilter extends React.Component<Props, State> {
  static defaultProps = defaultProps;

  state: State = {
    query: '',
    isLoading: false,
    value: this.props.value,
    textValue: this.props.value,
  };

  UNSAFE_componentWillReceiveProps(nextProps: Props) {
    if (nextProps.value !== this.state.value) {
      this.setState({
        value: nextProps.value,
        textValue: nextProps.value,
      });
    }
  }

  componentWillUnmount() {
    if (!this.api) {
      return;
    }
    this.api.clear();
  }

  api = new Client();

  handleLoadOptions = () => {
    const {tag, tagValueLoader} = this.props;
    const {textValue} = this.state;

    if (tag.isInput || tag.predefined) {
      return;
    }

    if (!this.api) {
      return;
    }

    this.setState({
      isLoading: true,
    });

    tagValueLoader(tag.key, textValue)
      .then(resp => {
        this.setState({
          isLoading: false,
          options: Object.values(resp).map(
            ({value}: TagValue): SelectOption => ({
              value,
              label: value,
            })
          ),
        });
      })
      .catch(() => {
        // TODO(billy): This endpoint seems to timeout a lot,
        // should we log these errors into datadog?

        addErrorMessage(
          tct('Unable to retrieve values for tag [tagName]', {
            tagName: textValue,
          })
        );
      });
  };

  handleChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    this.setState({
      textValue: value,
    });
    this.debouncedTextChange(value);
  };

  debouncedTextChange = debounce(text => {
    this.handleChange(text);
  }, 150);

  handleOpenMenu = () => {
    if (this.props.tag.predefined) {
      return;
    }

    this.setState(
      {
        isLoading: true,
      },
      this.handleLoadOptions
    );
  };

  handleChangeSelect = (valueObj: SelectOption | null) => {
    const value = valueObj ? valueObj.value : null;
    this.handleChange(value);
  };

  handleChangeSelectInput = (value: string) => {
    this.setState(
      {
        textValue: value,
      },
      this.handleLoadOptions
    );
  };

  handleChange = (value: string | null) => {
    const {onSelect, tag} = this.props;

    this.setState(
      {
        value,
      },
      () => {
        onSelect && onSelect(tag, value);
      }
    );
  };

  render() {
    const {tag} = this.props;
    const {options, isLoading} = this.state;

    return (
      <StreamTagFilter>
        <StyledHeader>{tag.key}</StyledHeader>

        {!!tag.isInput && (
          <Input value={this.state.textValue} onChange={this.handleChangeInput} />
        )}

        {!tag.isInput && (
          <SelectControl
            clearable
            aria-label={tag.key}
            placeholder="--"
            loadingMessage={() => t('Loading\u2026')}
            value={this.state.value}
            onChange={this.handleChangeSelect}
            isLoading={isLoading}
            onInputChange={this.handleChangeSelectInput}
            onFocus={this.handleOpenMenu}
            noResultsText={isLoading ? t('Loading\u2026') : t('No results found')}
            options={
              tag.predefined
                ? tag.values &&
                  tag.values.map(value => ({
                    value,
                    label: value,
                  }))
                : options
            }
          />
        )}
      </StreamTagFilter>
    );
  }
}

export default IssueListTagFilter;

const StreamTagFilter = styled('div')`
  margin-bottom: ${space(2)};
`;

const StyledHeader = styled('h6')`
  color: ${p => p.theme.subText};
  margin-bottom: ${space(1)};
`;
