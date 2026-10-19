// Support file for CCT_SETUP=swc only. The SWC preset emits legacy decorators with
// `design:paramtypes` metadata, so constructor injection needs reflect-metadata
// (per @jscutlery/swc-angular's README). The other setups keep the plain support file.
import 'reflect-metadata';
import './component';
