/**
 * ARIA: https://www.w3.org/TR/wai-aria/#combobox
 * Sample 1: https://www.w3.org/TR/2017/NOTE-wai-aria-practices-1.1-20171214/examples/combobox/aria1.1pattern/listbox-combo.html
 * Sample 2: https://www.w3.org/blog/wai-components-gallery/widget/combobox-with-aria-autocompleteinline/
 *
 * Tab logic:
 * Popup is close
 * 1. Focus input (mark component as focused)
 * 2. Press enter to show the popup
 * 3. If popup has input, focus it
 *
 * Popup is open
 * 1. press tab to close the popup
 * 2. Focus back to the selection input box
 * 3. Let the native tab going on
 *
 * RefSelect use 2 design type.
 * In single mode, we should focus on the `span`
 * In multiple mode, we should focus on the `input`
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  polyfill
} from 'react-lifecycles-compat';
import KeyCode from 'rc-util/lib/KeyCode';
import shallowEqual from 'shallowequal';

import SelectTrigger from './SelectTrigger';
import {
  selectorContextTypes
} from './Base/BaseSelector';
import {
  popupContextTypes
} from './Base/BasePopup';
import {
  searchContextTypes
} from './SearchInput';
import SingleSelector from './Selector/SingleSelector';
import MultipleSelector, {
  multipleSelectorContextTypes
} from './Selector/MultipleSelector';
import SinglePopup from './Popup/SinglePopup';
import MultiplePopup from './Popup/MultiplePopup';

import {
  SHOW_ALL,
  SHOW_PARENT,
  SHOW_CHILD
} from './strategies';

import {
  createRef,
  generateAriaId,
  formatInternalValue,
  formatSelectorValue,
  parseSimpleTreeData,
  convertDataToEntities,
  calcCheckStateConduct,
  calcUncheckConduct,
  flatToHierarchy,
  isPosRelated,
  isLabelInValue,
  getFilterTable,
} from './util';
import {
  valueProp
} from './propTypes';

class Select extends React.Component {
  static propTypes = {
    prefixCls: PropTypes.string,
    prefixAria: PropTypes.string,
    multiple: PropTypes.bool,
    showArrow: PropTypes.bool, // 这里要改成扩展按钮
    open: PropTypes.bool,
    value: valueProp,
    autoFocus: PropTypes.bool,

    defaultOpen: PropTypes.bool,
    defaultValue: valueProp,

    showSearch: PropTypes.bool,
    placeholder: PropTypes.node,
    inputValue: PropTypes.string, // [Legacy] Deprecated. Use `searchValue` instead.
    searchValue: PropTypes.string,
    autoClearSearchValue: PropTypes.bool,
    searchPlaceholder: PropTypes.node, // [Legacy] Confuse with placeholder
    disabled: PropTypes.bool,
    labelInValue: PropTypes.bool,
    maxTagCount: PropTypes.number,
    maxTagPlaceholder: PropTypes.oneOfType([
      PropTypes.node,
      PropTypes.func,
    ]),
    maxTagTextLength: PropTypes.number,
    showCheckedStrategy: PropTypes.oneOf([
      SHOW_ALL, SHOW_PARENT, SHOW_CHILD,
    ]),

    dropdownMatchSelectWidth: PropTypes.bool,
    dataSource: PropTypes.array,
    dataSourceSimpleMode: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
    tableRowFilterProp: PropTypes.string,
    rowLabelProp: PropTypes.string,
    rowCheckable: PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.node,
    ]),
    rowCheckStrictly: PropTypes.bool,
    defaultExpandAllRows: PropTypes.bool,
    defaultExpandedRowKeys: PropTypes.array,
    loadData: PropTypes.func,
    filterTableRow: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
    columns: PropTypes.array,
    tableScroll: PropTypes.object,
    emptyText: PropTypes.string,

    onSearch: PropTypes.func,
    onSelect: PropTypes.func,
    onDeselect: PropTypes.func,
    onChange: PropTypes.func,
    onDropdownVisibleChange: PropTypes.func,
    renderPopupContainer: PropTypes.func,
  };

  static childContextTypes = {
    rcRefSelect: PropTypes.shape({
      ...selectorContextTypes,
      ...multipleSelectorContextTypes,
      ...popupContextTypes,
      ...searchContextTypes
    }),
  };

  static defaultProps = {
    prefixCls: 'rc-ref-select',
    prefixAria: 'rc-ref-select',
    showArrow: true,
    showSearch: true,
    autoClearSearchValue: true,
    showCheckedStrategy: SHOW_CHILD,

    // dropdownMatchSelectWidth change the origin design, set to false now
    // ref: https://github.com/react-component/select/blob/4cad95e098a341a09de239ad6981067188842020/src/Select.jsx#L344
    // ref: https://github.com/react-component/select/pull/71
    tableRowFilterProp: 'name',
    rowLabelProp: 'name',
    emptyText: 'No Data',
    dataSource: [],
    columns: [{
      title: 'Code',
      dataIndex: 'code',
    }, {
      title: 'Name',
      dataIndex: 'name',
    }]
  };

  constructor(props) {
    super(props);

    const {
      prefixAria,
      defaultOpen,
      open,
    } = props;

    this.state = {
      open: open || defaultOpen,
      valueList: [],
      missValueList: [], // Contains the value not in the tree
      selectorValueList: [], // Used for multiple selector
      valueEntities: {},
      keyEntities: {},
      searchValue: '',

      init: true,
    };

    this.selectorRef = createRef();
    this.selectTriggerRef = createRef();

    // ARIA need `aria-controls` props mapping
    // Since this need user input. Let's generate ourselves
    this.ariaId = generateAriaId(`${prefixAria}-list`);
  }

  getChildContext() {
    return {
      rcRefSelect: {
        onSelectorFocus: this.onSelectorFocus,
        onSelectorBlur: this.onSelectorBlur,
        onSelectorKeyDown: this.onComponentKeyDown,
        onSelectorClear: this.onSelectorClear,
        onMultipleSelectorRemove: this.onMultipleSelectorRemove,

        onTableRowSelect: this.onTableRowSelect,
        onTableRowCheck: this.onTableRowCheck,
        onPopupKeyDown: this.onComponentKeyDown,
        onSearchInputChange: this.onSearchInputChange,
      },
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const {
      prevProps = {}
    } = prevState;
    const {
      rowCheckable,
      rowCheckStrictly,
      filterTableRow,
      tableRowFilterProp,
      dataSourceSimpleMode,
    } = nextProps;
    const newState = {
      prevProps: nextProps,
      init: false,
    };

    // Process the state when props updated
    function processState(propName, updater) {
      if (prevProps[propName] !== nextProps[propName]) {
        updater(nextProps[propName], prevProps[propName]);
        return true;
      }
      return false;
    }

    let valueRefresh = false;

    // Open
    processState('open', (propValue) => {
      newState.open = propValue;
    });

    // dataSource
    let dataSource;
    let dataSourceChanged = false;
    let dataSourceModeChanged = false;
    processState('dataSource', (propValue) => {
      dataSource = propValue;
      dataSourceChanged = true;
    });

    processState('dataSourceSimpleMode', (propValue, prevValue) => {
      if (!propValue) return;

      const prev = !prevValue || prevValue === true ? {} : prevValue;

      // Shallow equal to avoid dynamic prop object
      if (!shallowEqual(propValue, prev)) {
        dataSourceModeChanged = true;
      }
    });

    // Parse by `dataSourceSimpleMode`
    if (dataSourceSimpleMode && (dataSourceChanged || dataSourceModeChanged)) {
      const simpleMapper = {
        id: 'id',
        pId: 'pid',
        rootPId: null,
        ...(dataSourceSimpleMode !== true ? dataSourceSimpleMode : {}),
      };
      dataSource = parseSimpleTreeData(nextProps.dataSource, simpleMapper);
    }

    // Convert `dataSource` to entities
    if (dataSource) {
      const {
        data,
        valueEntities,
        keyEntities
      } = convertDataToEntities(dataSource);
      newState.dataSource = data;
      newState.valueEntities = valueEntities;
      newState.keyEntities = keyEntities;
      valueRefresh = true;
    }

    // Value List
    if (prevState.init) {
      processState('defaultValue', (propValue) => {
        newState.valueList = formatInternalValue(propValue, nextProps);
        valueRefresh = true;
      });
    }

    processState('value', (propValue) => {
      newState.valueList = formatInternalValue(propValue, nextProps);
      valueRefresh = true;
    });

    // Selector Value List
    if (valueRefresh) {
      // Find out that value not exist in the tree
      const missValueList = [];
      const filteredValueList = [];
      const keyList = [];

      // Get key by value
      (newState.valueList || prevState.valueList)
      .forEach((wrapperValue) => {
        const {
          value
        } = wrapperValue;
        const entity = (newState.valueEntities || prevState.valueEntities)[value];

        if (entity) {
          keyList.push(entity.key);
          filteredValueList.push(wrapperValue);
          return;
        }

        // If not match, it may caused by ajax load. We need keep this
        missValueList.push(wrapperValue);
      });

      // We need calculate the value when tree is checked tree
      if (rowCheckable && !rowCheckStrictly) {
        // Calculate the keys need to be checked
        const   checkedKeys  = calcCheckStateConduct(
          newState.keyEntities || prevState.keyEntities,
          keyList,
        );

        // Convert key back to value
        const valueList = checkedKeys.map(key => (
          (newState.keyEntities || prevState.keyEntities)[key].value
        ));

        // Format value list again for internal usage
        newState.valueList = formatInternalValue(valueList, nextProps);
      } else {
        newState.valueList = filteredValueList;
      }

      // Fill the missValueList, we still need display in the selector
      newState.missValueList = missValueList;

      // Calculate the value list for `Selector` usage
      newState.selectorValueList = formatSelectorValue(
        newState.valueList,
        nextProps,
        newState.valueEntities || prevState.valueEntities,
      );
    }

    // [Legacy] To align with `Select` component,
    // We use `searchValue` instead of `inputValue` but still keep the api
    // `inputValue` support `null` to work as `autoClearSearchValue`
    processState('inputValue', (propValue) => {
      if (propValue !== null) {
        newState.searchValue = propValue;
      }
    });

    // Search value
    processState('searchValue', (propValue) => {
      newState.searchValue = propValue;
    });

    // Do the search logic
    if (newState.searchValue !== undefined) {
      const upperSearchValue = String(newState.searchValue).toUpperCase();

      let filterTableRowFn = filterTableRow;
      if (filterTableRow === false) {
        // Don't filter if is false
        filterTableRowFn = () => true;
      } else if (typeof filterTableRowFn !== 'function') {
        // When is not function (true or undefined), use inner filter
        filterTableRowFn = (_, row) => {
          const rowValue = String(row[tableRowFilterProp]).toUpperCase();
          return rowValue.indexOf(upperSearchValue) !== -1;
        };
      }

      newState.filteredTableRows = getFilterTable(
        newState.dataSource || prevState.dataSource,
        newState.searchValue,
        filterTableRowFn,
      );
    }

    // Checked Strategy
    processState('showCheckedStrategy', () => {
      newState.selectorValueList = newState.selectorValueList || formatSelectorValue(
        newState.valueList || prevState.valueList,
        nextProps,
        newState.valueEntities || prevState.valueEntities,
      );
    });

    return newState;
  }

  componentDidMount() {
    const {
      autoFocus,
      disabled
    } = this.props;

    if (autoFocus && !disabled) {
      this.focus();
    }
  }

  componentDidUpdate(_, prevState) {
    if (prevState.valueList !== this.state.valueList) {
      this.forcePopupAlign();
    }
  }

  // ==================== Selector ====================
  onSelectorFocus = () => {
    this.setState({
      focused: true
    });

  };

  onSelectorBlur = () => {
    this.setState({
      focused: false
    });

    // TODO: Close when Popup is also not focused
    // this.setState({ open: false });
  };

  // Handle key board event in both Selector and Popup
  onComponentKeyDown = (event) => {
    const {
      open
    } = this.state;
    const {
      keyCode
    } = event;

    if (!open) {
      if ([KeyCode.ENTER, KeyCode.DOWN].indexOf(keyCode) !== -1) {
        this.setOpenState(true);
      }
    } else if (KeyCode.ESC === keyCode) {
      this.setOpenState(false);
    } else if ([KeyCode.UP, KeyCode.DOWN, KeyCode.LEFT, KeyCode.RIGHT].indexOf(keyCode) !== -1) {
      // TODO: Handle `open` state
      event.stopPropagation();
    }
  };

  onDeselect = (wrappedValue, row, rowEventInfo) => {
    const {
      onDeselect
    } = this.props;
    if (!onDeselect) return;

    onDeselect(wrappedValue, row, rowEventInfo);
  }

  onSelectorClear = (event) => {
    const {
      disabled
    } = this.props;
    if (disabled) return;

    this.triggerChange([], []);

    if (!this.isSearchValueControlled()) {
      this.setUncontrolledState({
        searchValue: '',
        filteredTableRows: null,
      });
    }

    event.stopPropagation();
  };

  onMultipleSelectorRemove = (event, removeValue) => {
    event.stopPropagation();

    const {
      valueList,
      missValueList,
      valueEntities
    } = this.state;

    const {
      rowCheckable,
      rowCheckStrictly,
      rowLabelProp,
      disabled
    } = this.props;
    if (disabled) return;

    // Find trigger entity
    const triggerEntity = valueEntities[removeValue];

    // Clean up value
    let newValueList = valueList;
    if (triggerEntity) {
      // If value is in tree
      if (rowCheckable && !rowCheckStrictly) {
        newValueList = valueList.filter(({
          value
        }) => {
          const entity = valueEntities[value];
          return !isPosRelated(entity.pos, triggerEntity.pos);
        });
      } else {
        newValueList = valueList.filter(({
          value
        }) => value !== removeValue);
      }
    }

    const extraInfo = {
      triggerValue: removeValue,
    };
    const deselectInfo = {};

    // [Legacy] Little hack on this to make same action as `onCheck` event.
    if (rowCheckable) {
      const filteredEntityList = newValueList.map(({
        value
      }) => valueEntities[value]);

      deselectInfo.event = 'check';
      deselectInfo.checked = false;
      deselectInfo.checkedRowsPositions = filteredEntityList
        .map(({
          value,
          pos
        }) => ({
          value,
          pos
        }));

      if (rowCheckStrictly) {
        extraInfo.allCheckedRows = newValueList;
      } else {
        // TODO: It's too expansive to get `halfCheckedKeys` in onDeselect. Not pass this.
        extraInfo.allCheckedRows = flatToHierarchy(filteredEntityList)
          .map(({
            value
          }) => value);
      }
    } else {
      deselectInfo.event = 'select';
      deselectInfo.selected = false;
      deselectInfo.selectedRows = newValueList;
    }

    // Some value user pass prop is not in the tree, we also need clean it
    const newMissValueList = missValueList.filter(({
      value
    }) => value !== removeValue);

    let wrappedValue;
    if (this.isLabelInValue()) {
      wrappedValue = {
        label: removeValue ? removeValue[rowLabelProp] : null,
        value: removeValue,
      };
    } else {
      wrappedValue = removeValue;
    }

    this.onDeselect(wrappedValue, removeValue, deselectInfo);

    this.triggerChange(newMissValueList, newValueList, extraInfo);
  };

  // ===================== Popup ======================
  onValueTrigger = (isAdd, rowList, rowEventInfo, rowExtraInfo) => {
    const {
      value
    } = rowEventInfo;
    const {
      missValueList,
      valueEntities,
      keyEntities,
    } = this.state;
    const {
      disabled,
      inputValue,
      rowLabelProp,
      onSelect,
      rowCheckable,
      rowCheckStrictly,
      autoClearSearchValue,
    } = this.props;
    const label = value[rowLabelProp];

    if (disabled) return;

    // Wrap the return value for user
    let wrappedValue;
    if (this.isLabelInValue()) {
      wrappedValue = {
        value,
        label,
      };
    } else {
      wrappedValue = value;
    }

    // [Legacy] Origin code not trigger `onDeselect` every time. Let's align the behaviour.
    if (isAdd) {
      if (onSelect) {
        onSelect(wrappedValue, value, rowEventInfo);
      }
    } else {
      this.onDeselect(wrappedValue, value, rowEventInfo);
    }

    // Get wrapped value list.
    // This is a bit hack cause we use key to match the value.
    let newValueList = rowList.map((row) => ({
      value: row,
      label: row[rowLabelProp],
    }));

    // When is `rowCheckable` and with `searchValue`, `valueList` is not full filled.
    // We need calculate the missing rows.
    if (rowCheckable && !rowCheckStrictly) {
      let keyList = newValueList.map(({
        value: val
      }) => valueEntities[val].key);
      if (isAdd) {
        keyList = calcCheckStateConduct(keyEntities, keyList);
      } else {
        keyList = calcUncheckConduct(keyList, valueEntities[value].key, keyEntities);
      }
      newValueList = keyList.map(key => {
        const entity = keyEntities[key];
        return {
          value: entity.value,
          label: entity.value[rowLabelProp],
        };
      });
    }

    // Clean up `searchValue` when this prop is set
    if (!this.isSearchValueControlled() && (autoClearSearchValue || inputValue === null)) {
      this.setUncontrolledState({
        searchValue: '',
        filteredTableRows: null,
      });
    }

    // [Legacy] Provide extra info
    const extraInfo = {
      ...rowExtraInfo,
      triggerValue: value,
    };

    this.triggerChange(missValueList, newValueList, extraInfo);
  };

  onTableRowSelect = (_, rowEventInfo) => {
    const {
      rowCheckable,
      multiple
    } = this.props;
    if (rowCheckable) return;

    if (!multiple) {
      this.setOpenState(false);
    }

    const {
      selectedRows
    } = rowEventInfo;
    const isAdd = rowEventInfo.selected;
    this.onValueTrigger(isAdd, selectedRows, rowEventInfo, {
      selected: isAdd
    });
  };

  onTableRowCheck = (_, rowEventInfo) => {
    const {
      searchValue,
      keyEntities,
      valueEntities,
      valueList
    } = this.state;
    const {
      rowCheckStrictly
    } = this.props;

    const {
      checkedRows,
      checkedRowsPositions
    } = rowEventInfo;
    const isAdd = rowEventInfo.checked;

    const extraInfo = {
      checked: isAdd,
    };

    // [Legacy] Check event provide `allCheckedRows`.
    // When `rowCheckStrictly` or internal `searchValue` is set, Table will be unrelated:
    // - Related: Show the top checked rows and has children prop.
    // - Unrelated: Show all the checked rows.

    if (rowCheckStrictly) {
      extraInfo.allCheckedRows = rowEventInfo.checkedRows;
    } else if (searchValue) {
      const oriKeyList = valueList
        .map(({
          value
        }) => valueEntities[value])
        .filter(entity => entity)
        .map(({
          key
        }) => key);
      const keyList = calcUncheckConduct(
        oriKeyList,
        rowEventInfo.eventKey,
        keyEntities,
      );
      extraInfo.allCheckedRows = keyList.map(key => keyEntities[key].value);
    } else {
      extraInfo.allCheckedRows = flatToHierarchy(checkedRowsPositions);
    }

    this.onValueTrigger(isAdd, checkedRows, rowEventInfo, extraInfo);
  };

  // ==================== Trigger =====================

  onDropdownVisibleChange = (open) => {
    this.setOpenState(open, true);
  };

  onSearchInputChange = ({
    target: {
      value
    }
  }) => {
    const {
      dataSource
    } = this.state;
    const {
      onSearch,
      filterTableRow,
      tableRowFilterProp
    } = this.props;

    if (onSearch) {
      onSearch(value);
    }

    let isSet = false;

    if (!this.isSearchValueControlled()) {
      isSet = this.setUncontrolledState({
        searchValue: value,
      });
      this.setOpenState(true);
    }

    if (isSet) {
      // Do the search logic
      const upperSearchValue = String(value).toUpperCase();

      let filterTableRowFn = filterTableRow;
      if (!filterTableRowFn) {
        filterTableRowFn = (_, row) => {
          const rowValue = String(row[tableRowFilterProp]).toUpperCase();
          return rowValue.indexOf(upperSearchValue) !== -1;
        };
      }

      this.setState({
        filteredTableRows: getFilterTable(dataSource, value, filterTableRowFn),
      });
    }
  };

  onSearchInputKeyDown = (event) => {
    const {
      searchValue,
      valueList
    } = this.state;

    const {
      keyCode
    } = event;

    if (
      KeyCode.BACKSPACE === keyCode &&
      this.isMultiple() &&
      !searchValue &&
      valueList.length
    ) {
      const lastValue = valueList[valueList.length - 1].value;
      this.onMultipleSelectorRemove(event, lastValue);
    }
  }
  /**
   * Only update the value which is not in props
   */
  setUncontrolledState = (state) => {
    let needSync = false;
    const newState = {};

    Object.keys(state).forEach(name => {
      if (name in this.props) return;

      needSync = true;
      newState[name] = state[name];
    });

    if (needSync) {
      this.setState(newState);
    }

    return needSync;
  };

  // [Legacy] Origin provide `documentClickClose` which triggered by `Trigger`
  // Currently `RefSelect` align the hide popup logic as `Select` which blur to hide.
  // `documentClickClose` is not accurate anymore. Let's just keep the key word.
  setOpenState = (open, byTrigger = false) => {
    const {
      onDropdownVisibleChange
    } = this.props;

    if (
      onDropdownVisibleChange &&
      onDropdownVisibleChange(open, {
        documentClickClose: !open && byTrigger
      }) === false
    ) {
      return;
    }

    this.setUncontrolledState({
      open
    });
  };

  // Tree checkable is also a multiple case
  isMultiple = () => {
    const {
      multiple,
      rowCheckable
    } = this.props;
    return !!(multiple || rowCheckable);
  };

  isLabelInValue = () => {
    return isLabelInValue(this.props);
  };

  // [Legacy] To align with `Select` component,
  // We use `searchValue` instead of `inputValue`
  // but currently still need support that.
  // Add this method the check if is controlled
  isSearchValueControlled = () => {
    const {
      inputValue
    } = this.props;
    if ('searchValue' in this.props) return true;
    return ('inputValue' in this.props) && inputValue !== null;
  };

  // TODO: onChoiceAnimationLeave
  forcePopupAlign = () => {
    const $trigger = this.selectTriggerRef.current;

    if ($trigger) {
      $trigger.forcePopupAlign();
    }
  };

  /**
   * 1. Update state valueList.
   * 2. Fire `onChange` event to user.
   */
  triggerChange = (missValueList, valueList, extraInfo = {}) => {
    const {
      valueEntities
    } = this.state;
    const {
      onChange,
      disabled
    } = this.props;

    if (disabled) return;

    // Trigger
    const extra = {
      // [Legacy] Always return as array contains label & value
      preValue: this.state.selectorValueList.map(({
        label,
        value
      }) => ({
        label,
        value
      })),
      ...extraInfo,
    };

    // Format value by `rowCheckStrictly`
    const selectorValueList = formatSelectorValue(valueList, this.props, valueEntities);

    if (!('value' in this.props)) {
      this.setState({
        missValueList,
        valueList,
        selectorValueList,
      });
    }

    // Only do the logic when `onChange` function provided
    if (onChange) {
      let connectValueList;

      // Get value by mode
      if (this.isMultiple()) {
        connectValueList = [...missValueList, ...selectorValueList];
      } else {
        connectValueList = selectorValueList.slice(0, 1);
      }

      let labelList = null;
      let returnValue;

      if (this.isLabelInValue()) {
        returnValue = connectValueList.map(({
          label,
          value
        }) => ({
          label,
          value
        }));
      } else {
        labelList = [];
        returnValue = connectValueList.map(({
          label,
          value
        }) => {
          labelList.push(label);
          return value;
        });
      }

      if (!this.isMultiple()) {
        returnValue = returnValue[0];
      }

      onChange(returnValue, labelList, extra);
    }
  };

  focus() {
    this.selectorRef.current.focus();
  }

  blur() {
    this.selectorRef.current.blur();
  }

  // ===================== Render =====================

  render() {
    const {
      valueList,
      missValueList,
      selectorValueList,
      valueEntities,
      keyEntities,
      searchValue,
      open,
      focused,
      dataSource,
      filteredTableRows,
    } = this.state;
    const {
      prefixCls
    } = this.props;
    const isMultiple = this.isMultiple();

    const passProps = {
      ...this.props,
      isMultiple,
      valueList,
      selectorValueList: [...missValueList, ...selectorValueList],
      valueEntities,
      keyEntities,
      searchValue,
      open,
      focused,
      dropdownPrefixCls: `${prefixCls}-dropdown`,
      ariaId: this.ariaId,
    };

    const Popup = isMultiple ? MultiplePopup : SinglePopup;
    const $popup = (
      <Popup
        {...passProps}
        data={filteredTableRows || dataSource}
      />
    );

    const Selector = isMultiple ? MultipleSelector : SingleSelector;
    const $selector = (
      <Selector
        {...passProps}
        ref={this.selectorRef}
        onChoiceAnimationLeave={this.forcePopupAlign}
      />
    );

    return (
      <SelectTrigger
        {...passProps}

        ref={this.selectTriggerRef}
        popupElement={$popup}

        onKeyDown={this.onKeyDown}
        onDropdownVisibleChange={this.onDropdownVisibleChange}
      >
        {$selector}
      </SelectTrigger>
    );
  }
}

Select.SHOW_ALL = SHOW_ALL;
Select.SHOW_PARENT = SHOW_PARENT;
Select.SHOW_CHILD = SHOW_CHILD;

// Let warning show correct component name
Select.displayName = 'RefSelect';

polyfill(Select);

export default Select;
