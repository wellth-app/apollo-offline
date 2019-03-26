import rehydrated, { State as RehydratedState } from "./rehydrated";

type OfflineState = {
  offline: {
    online: boolean;
    outbox: any[];
  };
};

export interface State extends OfflineState {
  rehydrated: RehydratedState;
}

export default {
  rehydrated,
};
