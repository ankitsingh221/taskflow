const PageHeader = ({ title, description }) => (
  <div className="tf-page-header">
    <h1 className="tf-page-title">{title}</h1>
    {description && <p className="tf-page-description">{description}</p>}
  </div>
);

export default PageHeader;
