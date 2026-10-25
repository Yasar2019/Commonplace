import type {Metadata} from 'next';import MyEntries from './MyEntries';
export const metadata:Metadata={title:'Your entries on this device | Commonplace',robots:{index:false,follow:false}};
export default function Page(){return <MyEntries/>}
