import { NextLink, Operation, Observable } from "apollo-link";

export default (operation: Operation, forward: NextLink) =>
  !!forward ? forward(operation) : Observable.of();
