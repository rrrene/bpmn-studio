import {IUserIdentity} from './IUserIdentity';

export interface ILoginResult {
  identity: IUserIdentity;
  accessToken: string;
  idToken: string;
}
