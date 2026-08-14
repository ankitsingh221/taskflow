import { useParams } from 'react-router';
import PageHeader from '../components/ui/PageHeader';

const JobDetails = () => {
  const { jobId } = useParams();

  return (
    <div className="tf-page">
      <PageHeader title="Job Details" description={jobId ? `Viewing job ${jobId}.` : 'Select a job to view details.'} />
    </div>
  );
};

export default JobDetails;
