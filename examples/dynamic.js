/* eslint react/no-multi-comp:0, no-console:0 */

import 'rc-ref-select/assets/index.less';
import React from 'react';
import ReactDOM from 'react-dom';
import TreeSelect from 'rc-ref-select';
import { getNewTreeData, generateTreeNodes } from './util';

class Demo extends React.Component {
  static propTypes = {};

  state = {
    treeData: [
      { label: 'pNode 01', value: '0-0', key: '0-0' },
      { label: 'pNode 02', value: '0-1', key: '0-1' },
      { label: 'pNode 03', value: '0-2', key: '0-2', isLeaf: true },
    ],
    // value: '0-0',
    value: { value: '0-0-0-value', label: '0-0-0-label' },
  };

  onChange = (value) => {
    console.log(value);
    this.setState({
      value,
    });
  };

  onLoadData = (treeNode) => {
    console.log(treeNode);
    return new Promise((resolve) => {
      setTimeout(() => {
        const treeData = [...this.state.treeData];
        getNewTreeData(treeData, treeNode.props.eventKey, generateTreeNodes(treeNode), 2);
        this.setState({ treeData });
        resolve();
      }, 500);
    });
  };

  render() {
    return (
      <div style={{ padding: '10px 30px' }}>
        <h2>dynamic render</h2>
        <TreeSelect
          style={{ width: 300 }}
          treeData={this.state.treeData}
          labelInValue
          value={this.state.value}
          onChange={this.onChange}
          loadData={this.onLoadData}
        />
      </div>
    );
  }
}

ReactDOM.render(<Demo />, document.getElementById('__react-content'));
