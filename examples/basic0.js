/* eslint react/no-multi-comp:0, no-console:0, no-alert: 0 */

import 'rc-ref-select/assets/index.less';
import React from 'react';
import ReactDOM from 'react-dom';
import 'rc-dialog/assets/index.css';
import RefSelect from 'rc-ref-select';
import './demo.less';


const dataSource = [{
    key: '1',
    name: '胡彦斌',
    age: 32,
    address: '西湖区湖底公园1号'
  }, {
    key: '2',
    name: '胡彦祖',
    age: 42,
    address: '西湖区湖底公园1号'
  }];

  for(let i=3;i<20;i++){
    dataSource.push( {
      key: i.toString(),
      name: `AAAAA-${i}`,
      age: 42,
      address: `西湖区湖底公园1号-${i}`
    })
  }

  const columns = [{
    title: '姓名',
    dataIndex: 'name',
    key: 'name',
    width: 100
  }, {
    title: '年龄',
    dataIndex: 'age',
    key: 'age',
    width: 100
  }, {
    title: '住址',
    dataIndex: 'address',
    key: 'address',
    width: 300
  }];

class Demo extends React.Component {
  state = {
    tsOpen: false,
    searchValue: '',
    value: null,
  }


  onSearch = (value) => {
    console.log(value, arguments);
    this.setState({ searchValue: value });
  }

  onChange = (value, ...rest) => {
    console.log('onChange', value, ...rest);
    this.setState({ value });
  }


  onSelect = () => {
    // use onChange instead
    console.log(arguments);
  }

  onDropdownVisibleChange = (visible, info) => {
    console.log(visible, this.state.value, info);
    if (Array.isArray(this.state.value) && this.state.value.length > 1
      && this.state.value.length < 3) {
      window.alert('please select more than two item or less than one item.');
      return false;
    }
    return true;
  }

  filterTreeNode = (input, child) => {
    return String(child.props.title).indexOf(input) === 0;
  }

  render() {



    return (
      <div style={{ margin: 20 }}>

        <h2>single select</h2>
        <RefSelect
          style={{ width: 300 }}
          transitionName="rc-ref-select-dropdown-slide-up"
          choiceTransitionName="rc-ref-select-selection__choice-zoom"
          dropdownStyle={{ maxHeight: 200, overflow: 'auto' }}
          placeholder={<i>请下拉选择</i>}
          searchPlaceholder="please search"
          showSearch allowClear
          searchValue={this.state.searchValue}
          value={this.state.value}
          dataSource={dataSource}
          columns={columns}
          treeNodeFilterProp="label"
          filterTreeNode={false}
          onSearch={this.onSearch}
          open={this.state.tsOpen}
          onChange={(value, ...args) => {
            console.log('onChange', value, ...args);
            if (value === '0-0-0-0-value') {
              this.setState({ tsOpen: true });
            } else {
              this.setState({ tsOpen: false });
            }
            this.setState({ value });
          } }
          onDropdownVisibleChange={(v, info) => {
            console.log('single onDropdownVisibleChange', v, info);
            // document clicked
            if (info.documentClickClose && this.state.value === '0-0-0-0-value') {
              return false;
            }
            this.setState({
              tsOpen: v,
            });
            return true;
          } }
          onSelect={this.onSelect}
        />


      </div>
    );
  }
}

ReactDOM.render(<Demo />, document.getElementById('__react-content'));
