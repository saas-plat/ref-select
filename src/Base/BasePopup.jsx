import React from 'react';
import PropTypes from 'prop-types';
import {
  polyfill
} from 'react-lifecycles-compat';
import Table from 'rc-table';

export const popupContextTypes = {
  onPopupKeyDown: PropTypes.func.isRequired,
  onTableRowSelect: PropTypes.func.isRequired,
  onTableRowCheck: PropTypes.func.isRequired,
};

class BasePopup extends React.Component {
  static propTypes = {
    prefixCls: PropTypes.string,
    valueList: PropTypes.array,
    valueEntities: PropTypes.object,
    keyEntities: PropTypes.object,
    // treeIcon: PropTypes.bool,
    // treeLine: PropTypes.bool,
    rowCheckable: PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.node,
    ]),
    rowCheckStrictly: PropTypes.bool,
    emptyText: PropTypes.string,
    defaultExpandAllRows: PropTypes.bool,
    defaultExpandedRowKeys: PropTypes.array,
    // expandedRowKeys: PropTypes.array,
    loadData: PropTypes.func,
    multiple: PropTypes.bool,
    data: PropTypes.array,
    columns: PropTypes.array,
    tableScroll: PropTypes.object,

    ariaId: PropTypes.string,

    // HOC
    renderSearch: PropTypes.func,
    renderPopupContainer: PropTypes.func,

    showHeader: PropTypes.bool,
    tableTitle: PropTypes.func,
    tableFooter: PropTypes.func,
  };

  static defaultProps = {
    renderPopupContainer: node => node
  }

  static contextTypes = {
    rcRefSelect: PropTypes.shape({
      ...popupContextTypes,
    }),
  };

  constructor() {
    super();

    this.state = {
      keyList: [],
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const {
      prevProps = {}
    } = prevState || {};
    const {
      valueList,
      valueEntities,
      // keyEntities
    } = nextProps;

    const newState = {
      prevProps: nextProps,
    };

    // Check value update
    if (valueList !== prevProps.valueList) {
      newState.keyList = valueList
        .map(({
          value
        }) => valueEntities[value])
        .filter(entity => entity)
        .map(({
          key
        }) => key);
    }

    return newState;
  }

  handleRow = (record, index) => {
    const {
      keyList,
    } = this.state;
    let selectedRows;
    if (this.props.rowCheckable) {
      selectedRows = keyList;
    } else {
      selectedRows = [record];
    }
    return {
      onClick: () => {
        this.context.rcRefSelect.onTableRowSelect(this, {
          rowIndex: index,
          value: record,
          selectedRows,
          selected: true
        })
      }
    }
  }

  render() {
    const {
      prefixCls,
      data,
      emptyText,
      columns,
      tableScroll,
      defaultExpandAllRows,
      defaultExpandedRowKeys,
      // loadData,
      ariaId,
      renderSearch,
      renderPopupContainer,
      showHeader,
      tableTitle,
      tableFooter
    } = this.props;
    const {
      rcRefSelect: {
        onPopupKeyDown,
      }
    } = this.context;

    const ele = (
      <div
        role="listbox"
        id={ariaId}
        onKeyDown={onPopupKeyDown}
        tabIndex={-1}
      >
        {renderSearch ? renderSearch() : null}
        <Table prefixCls={`${prefixCls}-table`}
          useFixedHeader showHeader={showHeader}
          tableTitle={tableTitle} tableFooter={tableFooter}
          columns={columns} data={data} scroll={tableScroll} emptyText={emptyText}
          defaultExpandAllRows={defaultExpandAllRows}
          defaultExpandedRowKeys={defaultExpandedRowKeys}
          onRow={this.handleRow}/>
      </div>
    );

    return renderPopupContainer(ele);
  }
}

polyfill(BasePopup);

export default BasePopup;
