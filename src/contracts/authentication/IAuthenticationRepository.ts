import {IIdentity} from '../../../node_modules/@essential-projects/iam_contracts';
import {ILoginResult} from './ILoginResult';
import {ILogoutResult} from './ILogoutResult';

export interface IAuthenticationRepository {
  login(username: string, password: string): Promise<ILoginResult>;
  logout(): Promise<ILogoutResult>;
  getIdentity(token: string): Promise<IIdentity>;
}
