/* eslint react/no-multi-comp:0, no-console:0 */
import 'rc-ref-select/assets/index.less';
import TreeSelect from 'rc-ref-select';
import React from 'react';
import ReactDOM from 'react-dom';

const SHOW_PARENT = TreeSelect.SHOW_PARENT;

const treeData = [{
  label: 'Node1',
  value: '0-0',
  key: '0-0',
  children: [{
    label: 'Child Node1',
    value: '0-0-0',
    key: '0-0-0',
  }],
}, {
  label: 'Node2',
  value: '0-1',
  key: '0-1',
  children: [{
    label: 'Child Node3',
    value: '0-1-0',
    key: '0-1-0',
  }, {
    label: 'Child Node4',
    value: '0-1-1',
    key: '0-1-1',
  }, {
    label: 'Child Node5',
    value: '0-1-2',
    key: '0-1-2',
  }],
}];

class Demo extends React.Component {
  state = {
    value: ['0-0-0'],
    disabled: false,
  }
  onChange = (value) => {
    console.log('onChange ', value, arguments);
    this.setState({ value });
  }
  switch = (checked) => {
    this.setState({ disabled: checked });
  }
  render() {
    const tProps = {
      treeData,
      disabled: this.state.disabled,
      value: this.state.value,
      onChange: this.onChange,
      multiple: true,
      allowClear: true,
      treeCheckable: true,
      showCheckedStrategy: SHOW_PARENT,
      searchPlaceholder: 'Please select',
      style: {
        width: 300,
      },
    };
    return (
      <div>
        <TreeSelect {...tProps} />
        <input type="checkbox" onChange={e => this.switch(e.target.checked)}/> 禁用
      </div>
    );
  }
}

ReactDOM.render(<Demo />, document.getElementById('__react-content'));
