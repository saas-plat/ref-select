/**
 * Input Box is in different position for different mode.
 * This not the same design as `Select` cause it's followed by antd 0.x `Select`.
 * We will not follow the new design immediately since antd 3.x is already released.
 *
 * So this file named as Selector to avoid confuse.
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { polyfill } from 'react-lifecycles-compat';
import { createRef } from '../util';

export const selectorPropTypes = {
  prefixCls: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
  open: PropTypes.bool,
  valueList: PropTypes.array, // Name as valueList to diff the single value
  allowClear: PropTypes.bool,
  showRefer: PropTypes.bool,
  referIcon: PropTypes.node,
  onClick: PropTypes.func,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
  removeSelected: PropTypes.func,
  tableRowFilterProp: PropTypes.string,

  // Pass by component
  ariaId: PropTypes.string,
};

export const selectorContextTypes = {
  onSelectorFocus: PropTypes.func.isRequired,
  onSelectorBlur: PropTypes.func.isRequired,
  onSelectorKeyDown: PropTypes.func.isRequired,
  onSelectorClear: PropTypes.func.isRequired,
};

export default function (modeName) {
  class BaseSelector extends React.Component {
    static propTypes = {
      ...selectorPropTypes,

      // Pass by HOC
      renderSelection: PropTypes.func.isRequired,
      renderPlaceholder: PropTypes.func,
      tabIndex: PropTypes.number,
    };

    static contextTypes = {
      rcRefSelect: PropTypes.shape({
        ...selectorContextTypes,
      }),
    };

    static defaultProps = {
      tabIndex: 0,
    }

    constructor() {
      super();

      this.domRef = createRef();
    }

    onFocus = (...args) => {
      const { onFocus, focused } = this.props;
      const { rcRefSelect: { onSelectorFocus } } = this.context;

      if (!focused) {
        onSelectorFocus();
      }

      if (onFocus) {
        onFocus(...args);
      }
    };

    onBlur = (...args) => {
      const { onBlur } = this.props;
      const { rcRefSelect: { onSelectorBlur } } = this.context;

      // TODO: Not trigger when is inner component get focused
      onSelectorBlur();

      if (onBlur) {
        onBlur(...args);
      }
    };

    onRefer = (...args) => {
      const {onRefer} = this.props;
      args[0].stopPropagation();
      if (onRefer) {
        onRefer(...args);
      }
    };

    focus = () => {
      this.domRef.current.focus();
    }

    blur = () => {
      this.domRef.current.focus();
    }

    renderClear() {
      const { prefixCls, allowClear, valueList } = this.props;
      const { rcRefSelect: { onSelectorClear } } = this.context;

      if (!allowClear || !valueList.length || !valueList[0].value) {
        return null;
      }

      return (
        <span
          key="clear"
          className={`${prefixCls}-selection__clear`}
          onClick={onSelectorClear}
        />
      );
    }

    renderRefer() {
      const { prefixCls, showRefer, referIcon } = this.props;
      if (!showRefer) {
        return null;
      }

      return (
        <a
          key="refer"
          onClick={this.onRefer}
          className={`${prefixCls}-refer`}
          style={{ outline: 'none' }}
        >
          {referIcon || <b />}
        </a>
      );
    }

    render() {
      const {
        prefixCls, className, style,
        open, focused, disabled, allowClear,
        onClick,
        ariaId,
        renderSelection, renderPlaceholder,
        tabIndex,
      } = this.props;
      const { rcRefSelect: { onSelectorKeyDown } } = this.context;

      let myTabIndex = tabIndex;
      if (disabled) {
        myTabIndex = null;
      }

      return (
        <span
          style={style}
          onClick={onClick}
          className={classNames(
            className,
            prefixCls,
            {
              [`${prefixCls}-open`]: open,
              [`${prefixCls}-focused`]: open || focused,
              [`${prefixCls}-disabled`]: disabled,
              [`${prefixCls}-enabled`]: !disabled,
              [`${prefixCls}-allow-clear`]: allowClear,
            }
          )}
          ref={this.domRef}
          role="combobox"
          aria-expanded={open}
          aria-owns={open ? ariaId : undefined}
          aria-controls={open ? ariaId : undefined}
          aria-haspopup="listbox"
          aria-disabled={disabled}
          tabIndex={myTabIndex}
          onFocus={this.onFocus}
          onBlur={this.onBlur}
          onMouseEnter={this.props.onMouseEnter}
          onMouseLeave={this.props.onMouseLeave}
          onKeyDown={onSelectorKeyDown}
        >
          <span
            key="selection"
            className={classNames(
              `${prefixCls}-selection`,
              `${prefixCls}-selection--${modeName}`
            )}
          >
            {renderSelection()}
            {this.renderClear()}
            {this.renderRefer()}

            {renderPlaceholder && renderPlaceholder()}
          </span>
        </span>
      );
    }
  }

  polyfill(BaseSelector);

  return BaseSelector;
}
