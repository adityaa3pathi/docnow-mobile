import { DoctorHome } from '@/components/doctor/doctor-home';

// Named practice, not doctor, so it does not share the /doctor path with the doctor stack.
export default function PracticeTab() {
  return <DoctorHome />;
}
