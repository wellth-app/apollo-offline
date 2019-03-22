import debug from "debug";

const debugLogger = debug("apollo-offline");

const extend = function(category = "") {
  const newCategory = category
    ? [...this.namespace.split(":"), category].join(":")
    : this.namespace;

  const result = debug(newCategory);
  result.extend = extend.bind(result);

  return result;
};

debugLogger.extend = extend.bind(debugLogger);

export default debugLogger;
