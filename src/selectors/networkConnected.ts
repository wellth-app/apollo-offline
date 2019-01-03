// @flow
import { State } from "../reducers";

export default (state: State): boolean => state.offline.online;
