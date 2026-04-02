
import ZambianReportBook from '../../components/ZambianReportBook';
import { getSocket } from '../../utils/socket';
import { useStore } from '../../store/useStore';

export default function ParentResults() {
  const { token } = useStore();
  const socket = getSocket();
  return <ZambianReportBook socket={socket} token={token} isAdmin={false}/>;
}
