type LandingPricingCardProps = {
    chooseLabel: string;
    description: string;
    features: string[];
    featured: boolean;
    name: string;
    popularLabel: string;
    price: string;
};

export function LandingPricingCard({ chooseLabel, description, featured, features, name, popularLabel, price }: LandingPricingCardProps) {
    return (
        <article className={`swpricing-editorial-card${featured ? ' swpricing-editorial-featured' : ''}`}>
            <div className="swpricing-editorial-name">
                {name} {featured ? <span className="swpricing-most-popular">{popularLabel}</span> : null}
            </div>
            <div className="swpricing-editorial-price">{price}</div>
            <p className="swpricing-editorial-desc">{description}</p>
            <ul className="swpricing-editorial-list">
                {features.map((feature) => (
                    <li key={feature}>{feature}</li>
                ))}
            </ul>
            <a className={`swpricing-editorial-btn${featured ? ' swpricing-editorial-btn-featured' : ''}`} href="#">
                <span>{chooseLabel}</span>
                <span>→</span>
            </a>
        </article>
    );
}
