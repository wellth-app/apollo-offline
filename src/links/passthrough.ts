import { NextLink, Operation, Observable, FetchResult } from "apollo-link";

export default (
  operation: Operation,
  forward: NextLink,
): Observable<FetchResult> => (forward ? forward(operation) : Observable.of());
