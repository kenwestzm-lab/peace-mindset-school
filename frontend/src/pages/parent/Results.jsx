import ZambianReportBook from '../../components/ZambianReportBook';
import { getSocket } from '../../utils/socket';
import { useStore } from '../../store/useStore';

export default function ParentResults() {
  const { user, token } = useStore();
  const socket = getSocket();
  const child = user?.children?.[0];

  return (
    <ZambianReportBook
      socket={socket}
      token={token}
      isAdmin={false}
      childId={child?._id}
      childName={child?.name}
    />
  );
}
