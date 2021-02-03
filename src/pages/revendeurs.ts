import { html, TemplateResult } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat';
import { property, customElement } from 'lit-element';

import Page from '../core/strategies/Page';
import Constants from '../constants';

import { Utils } from '../core/ui/ui';
import { fadeWith } from '../core/animations';
import { wrap } from '../core/errors/errors';
import { from } from 'rxjs';
import { map, reduce, tap } from 'rxjs/operators';
import { ListItem } from '@material/mwc-list/mwc-list-item';

interface ResellerMinimal {
    title: string;
    content: string;
    featuredImage: {
        node: {
            sourceUrl: string;
        }
    };
    address: string;
    website: string;
    phone: string;
    mail: string;
    tags: {
        nodes: {
          name: string;
        }[]
    }
}

@customElement('ui-revendeurs')
export class ResellersController extends Page {
    public static readonly hasRouting: boolean = true;

    @property({type: Object, reflect: false})
    public resellers: ResellerMinimal[];
    @property({type: Object, reflect: false})
    private tags: Set<string> = new Set();
    private _ghostResellers: ResellerMinimal[] = [];
    @property({type: String, reflect: false})
    public dataType = 'all';

    private async _load(){
        const pageQuery = `
        {
            revendeurs {
              nodes {
                title(format: RENDERED)
                content(format: RENDERED)
                featuredImage {
                  node {
                    sourceUrl(size: MEDIUM_LARGE)
                  }
                }
                address
                website
                phone
                mail
                tags {
                    nodes {
                        name
                        description
                    }
                }
              }
            }
        }                      
        `;

        const resellersR = await fetch(Constants.graphql, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: pageQuery
            })
        }).then(res => res.json()).then(res => res.data.revendeurs.nodes).catch(_ => this.dispatchEvent(wrap(_))) as ResellerMinimal[];

        this.resellers = resellersR;
        this._ghostResellers = resellersR;

        from(this.resellers).pipe(
            map(reseller => reseller.tags.nodes.map(node => node.name)),
            reduce((acc, val) => [...acc, ...val], []),
            map(tags => new Set(tags)),
            tap(tags => this.tags = tags),
        ).subscribe();

        this.loaded = true;

        document.title = 'Revendeurs | ' + Constants.title;

        if(Utils.animationsReduced()){
            return;
        }

        const fade = fadeWith(300, true);
        this._page.animate(fade.effect, fade.options);
    }

    public async firstUpdated(): Promise<void> {
        await this._load();
    }

    public render(): void | TemplateResult {
        return html`
        <div id="page" class="page" role="main">
            ${!this.loaded ? html`
            <div class="loading">
                <mwc-circular-progress indeterminate></mwc-circular-progressr>
            </div>` : html`
            <div class="cols">
                <div class="content">
                    <h2>Points de vente</h2>
                    <div class="resellers-types">
                        <mwc-list activatable @click=${(e: Event) => {
                            const listItem = e.target;
                            if(!(listItem instanceof ListItem)){
                                return;
                            }

                            this.dataType = listItem.dataset.type;
                            if(this.dataType === 'all'){
                                this.resellers = this._ghostResellers;
                            } else {
                                this.resellers = this._ghostResellers.filter(reseller => reseller.tags.nodes.map(node => node.name).includes(this.dataType));
                            }
                        }}>
                            <mwc-list-item .activated=${'all' === this.dataType} data-type=${'all'}>Tous</mwc-list-item>
                            ${repeat(this.tags, tag => {
                                return html`<mwc-list-item .activated=${tag === this.dataType} data-type=${tag}>${tag}</mwc-list-item>`;
                            })}
                        </mwc-list>
                        <div class="current-type">
                            ${repeat(this.resellers, reseller => {
                                return html`
                                <div class="reseller-block">
                                    <div class="reseller-image">
                                        ${reseller.featuredImage?.node?.sourceUrl ? html`
                                            <elara-image .catch=${true} src="${reseller.featuredImage?.node?.sourceUrl}"></elara-image>
                                        ` : html``}
                                    </div>
                                    <div class="reseller-meta">
                                        <h3>${reseller.title}</h3>
                                        ${reseller.website ? html`<a href="${reseller.website}" rel="nofollow">${reseller.website}</a>` : ''}
                                        ${reseller.mail ? html`<a href="mailto:${reseller.mail}">${reseller.mail}</a>` : ''}
                                        ${reseller.address ? html`<a href="https://maps.google.com/?q=${reseller.address}">${reseller.address}</span>` : ''}
                                        ${reseller.phone ? html`<a href="tel:${reseller.phone}">${reseller.phone}</span>` : ''}
                                    </div>
                                </div>
                                `;
                            })}
                        </div>
                    </div>
                </div>
            </div>
            `}
        </div>
        `;
    }

    private get _page(){
        return this.querySelector('#page');
    }
}