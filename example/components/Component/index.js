/**
 * Author: <%= data.authorName %>
 * Date: <%= data.date %>
 * Desc: 这是什么？
 */
import React from 'react';
// import "./index.less";

function <%= data.componentName %>({ children, className = '' }) {
  console.log('123');
  return <div className={`${className}`}>{children}</div>;
}
export default <%= data.componentName %>;
