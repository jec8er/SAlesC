import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'SaborClick Studio · Turn your craft into commerce',description:'A private workspace for direct commerce, content production and documented revenue.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
