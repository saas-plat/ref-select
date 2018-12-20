import PropTypes from 'prop-types';
import { isLabelInValue } from './util';

export function genArrProps(propType) {
  return PropTypes.oneOfType([
    propType,
    PropTypes.arrayOf(propType),
  ]);
}

/**
 * Origin code check `multiple` is true when `treeCheckStrictly` & `labelInValue`.
 * But in process logic is already cover to array.
 * Check array is not necessary. Let's simplify this check logic.
 */
export function valueProp(...args) {
  const [props, propName, Component] = args;

  if (isLabelInValue(props)) {
    const err = genArrProps(PropTypes.shape({
      label: PropTypes.node,
      value: PropTypes.object,
    }))(...args);
    if (err) {
      return new Error(
        `Invalid prop \`${propName}\` supplied to \`${Component}\`. ` +
        `You should use { label: string, value: object } or [{ label: string, value: object }] instead.`
      );
    }
    return null;
  }

  const err = genArrProps(PropTypes.object)(...args);
  if (err) {
    return new Error(
      `Invalid prop \`${propName}\` supplied to \`${Component}\`. ` +
      `You should use object or [object] instead.`
    );
  }
  return null;
}
