import {IChangeListEntry} from './IChangeListEntry';

export interface IDiffChangeListData {
  added: Array<IChangeListEntry>;
  changed: Array<IChangeListEntry>;
  layoutChanged: Array<IChangeListEntry>;
  removed: Array<IChangeListEntry>;
}
