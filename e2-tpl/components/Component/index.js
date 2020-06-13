/**
 * Author: <%= e2.authorName %>
 * Date: <%= e2.date %>
 * Desc: 这是什么？
 */
import React from 'react';
// import "./index.less";

function <%= e2.componentName %>({ children, className = '' }) {
  console.log('123');
  return <div className={`${className}`}>{children}</div>;
}
export default <%= e2.componentName %>;
