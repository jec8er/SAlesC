import Studio from './studio';
import { requireChatGPTUser } from './chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requireChatGPTUser('/');return <Studio displayName={user.fullName || user.email}/>;}
